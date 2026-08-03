// BeeHash CORS proxy — Cloudflare Worker
// Deploy (free, ~5 min):
//   1. workers.cloudflare.com → sign up → Create Worker
//   2. Paste this entire file, Deploy
//   3. Your URL: https://YOUR-NAME.YOUR-SUBDOMAIN.workers.dev
//   4. In app.html set:  const DEFAULT_PROXY = 'https://YOUR-NAME.YOUR-SUBDOMAIN.workers.dev/?url=';
//
// Only whitelisted CKPool endpoints are proxied — this can't be abused as an
// open proxy.

export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get('url');
    const allowed = [
      'https://solo.ckpool.org/',
      'https://eusolo.ckpool.org/',
      'https://mempool.space/',
      'https://api.coingecko.com/',
      'https://api.blockchair.com/'
    ];
    if (!url || !allowed.some(a => url.startsWith(a))) {
      return new Response('blocked: ' + (url || 'no url'), { status: 403 });
    }
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'beehash-monitor/1.0' },
        cf: { cacheTtl: 30, cacheEverything: true }
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=30'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream fetch failed: ' + e.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};