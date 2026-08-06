/**
 * Pool adapters.
 *
 * CKPool and 2Miners use documented, verified public JSON APIs.
 * MolePool and MySoloPool do NOT have a documented public JSON API as of
 * this writing. Rather than guess an endpoint and risk silently returning
 * wrong or fabricated data, those adapters return a clear "unverified"
 * error status. Confirm their real API (ask pool support, or inspect
 * their site's own dashboard network requests) and fill in fetchUrl()
 * before enabling them for real customers.
 */

const CACHE_TTL_MS = 60 * 1000; // matches the 60s refresh your frontend already advertises

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json();
}

/** CKPool solo — https://solo.ckpool.org/users/<btc-address> */
async function fetchCKPool(address) {
  const data = await fetchJson(`https://solo.ckpool.org/users/${address}`);
  return {
    pool: 'ckpool',
    address,
    hashrate1m: data.hashrate1m ?? null,
    hashrate5m: data.hashrate5m ?? null,
    hashrate1hr: data.hashrate1hr ?? null,
    bestshare: data.bestshare ?? null,
    workers: data.workers ?? null,
    shares: data.shares ?? null,
    raw: data,
  };
}

/**
 * 2Miners — per-coin subdomain, e.g. https://kas.2miners.com/api/accounts/{wallet}
 * Note: 2Miners does not run a BTC solo pool; this only applies if you're
 * quoting hashrate for an altcoin they support (KAS, ERG, CKB, etc).
 * Pass the coin explicitly.
 */
async function fetch2Miners(coin, address) {
  const data = await fetchJson(`https://${coin}.2miners.com/api/accounts/${address}`);
  return {
    pool: '2miners',
    coin,
    address,
    hashrate: data.currentHashrate ?? null,
    hashrate2h: data.hashrate ?? null,
    workers: data.workersOnline ?? null,
    raw: data,
  };
}

/** MolePool — no verified public JSON API. Do not fabricate a response. */
async function fetchMolePool(address) {
  return {
    pool: 'molepool',
    address,
    status: 'unverified_api',
    error: 'MolePool public JSON API not confirmed. Verify the real endpoint before enabling.',
  };
}

/** MySoloPool — no verified public JSON API. Do not fabricate a response. */
async function fetchMySoloPool(address) {
  return {
    pool: 'mysolopool',
    address,
    status: 'unverified_api',
    error: 'MySoloPool public JSON API not confirmed. Verify the real endpoint before enabling.',
  };
}

/**
 * Mineshop (solo.mineshop.eu) — the miner dashboard at
 * https://solo.mineshop.eu/miner/?wallet=<address> is JS-rendered; the
 * actual data call happens client-side and wasn't visible via static fetch
 * or search. No verified public JSON API. Do not fabricate a response —
 * open the page in a real browser, check devtools Network tab for the
 * request it makes (likely something like /api/miner/<address>), and
 * fill that in here before enabling.
 */
async function fetchMineshop(address) {
  return {
    pool: 'mineshop',
    address,
    status: 'unverified_api',
    error: 'Mineshop public JSON API not confirmed. Inspect solo.mineshop.eu/miner/ network requests in devtools to find it, then fill in fetchMineshop().',
  };
}

const ADAPTERS = {
  ckpool: fetchCKPool,
  '2miners': fetch2Miners,
  molepool: fetchMolePool,
  mysolopool: fetchMySoloPool,
  mineshop: fetchMineshop,
};

/**
 * Poll a pool, using the cache if fresh, otherwise fetch live and cache.
 * db is the better-sqlite3 instance from db.js.
 */
async function getPoolStats(db, pool, address, extra) {
  const adapter = ADAPTERS[pool];
  if (!adapter) {
    return { status: 'error', error: `Unknown pool: ${pool}` };
  }

  const cacheKey = pool === '2miners' ? `${extra}:${address}` : address;
  const cached = db
    .prepare('SELECT data, status, fetched_at FROM pool_stats_cache WHERE pool = ? AND address = ?')
    .get(pool, cacheKey);

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at + 'Z').getTime();
    if (age < CACHE_TTL_MS) {
      return { ...JSON.parse(cached.data), status: cached.status, cached: true };
    }
  }

  try {
    const result = pool === '2miners' ? await adapter(extra, address) : await adapter(address);
    const status = result.status || 'live';
    db.prepare(
      `INSERT INTO pool_stats_cache (pool, address, data, status, fetched_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(pool, address) DO UPDATE SET data = excluded.data, status = excluded.status, fetched_at = excluded.fetched_at`
    ).run(pool, cacheKey, JSON.stringify(result), status);
    return { ...result, status, cached: false };
  } catch (err) {
    // Honest error, not a guessed number — matches the site's own rule.
    return { status: 'error', error: err.message, pool, address };
  }
}

module.exports = { getPoolStats, ADAPTERS };
