# BeeHash Cloud — Pre-Launch Static Package

Static site. No build step. No server required for the public pages.
Every number is live public API data, clearly labeled demo data, or an honest zero.

## Public files (deploy these)

| File | Role |
|------|------|
| `index.html` | Landing — live tickers, honest zeros, roadmap, waitlist |
| `app.html` | BTC app — Chain / Monitor / Economics / Launch |
| `bch.html` | SoloBCH — live BCH network, odds calculator, indicative plans |
| `worker.js` | Cloudflare Worker CORS proxy (optional, for CKPool monitor) |

Do **not** deploy `parked/` to a public URL until launch gates pass.

## Recommended order (operator checklist)

### 1. Deploy the static trio (~5 min)

```bash
# local smoke test
cd this-folder
python3 -m http.server 8080
# open http://localhost:8080
```

**GitHub Pages:** new repo → upload `index.html`, `app.html`, `bch.html` → Settings → Pages → main / root.  
**Netlify / Vercel:** drag this folder (without publishing `parked/` if your host allows exclude rules).

Live APIs (mempool.space, CoinGecko, Blockchair) allow browser origins, so Chain / Economics / BCH work immediately.

### 2. Wire waitlist + optional CORS proxy (~8 min)

**Waitlist (both files must match):**

1. https://formspree.io → free form → copy endpoint  
2. Set in **both** `index.html` and `app.html`:

```js
const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_ID';
```

Until set, the form saves only in the visitor’s browser and tells them so. It never fakes success.

**CKPool Monitor proxy (optional but recommended):**

1. https://workers.cloudflare.com → Create Worker → paste `worker.js` → Deploy  
2. In `app.html`:

```js
const DEFAULT_PROXY = 'https://YOUR-NAME.workers.dev/?url=';
```

Visitors can also paste a proxy at runtime; it persists in their browser.  
Without a proxy, Monitor shows a clear CORS error and offers **Preview demo UI**.

### 3. Keep the customer dashboard parked

`parked/beehash-app.html` is a full rental/wallet UI. It is **not** linked from the public site.

Hard rules before any public link or payment:

- Real hashrate online  
- Public proof: `https://solo.ckpool.org/users/<your-btc-address>` published on the Launch tab and landing roadmap  
- Legal review + entity + Terms of Service  
- Real backend (API_URL) — not the placeholder  

The file itself shows a red **PARKED** banner until `API_URL` is a real backend.

### 4. When hardware is live

1. Point miners at `stratum+tcp://solo.ckpool.org:3333` (username = BTC address, password = `x`).  
2. Confirm shares at `solo.ckpool.org/users/<address>`.  
3. Publish that URL on the Launch tab and landing roadmap; flip those items to DONE.  
4. Only then open legal/payments and consider un-parking the customer dashboard.

## Data provenance rule

Every stat has a chip: **LIVE** | **CACHED** | **ERROR** | **DEMO** | **HONEST**.  
Failed fetches show “unavailable”, never a guessed number. Demo mode has a full-width banner.

## Hard rules

- No fabricated mining stats. Hosted hashrate / customers / blocks start at **0**.  
- No payment collection on the public site until hardware proof + legal review.  
- Keep the **PRE-LAUNCH** badge until those are true.

## SoloBCH notes

`bch.html` uses Blockchair + CoinGecko. Plans are indicative only; nothing is purchasable. Network blocks are labeled as whole-network blocks, not this project’s finds.

## License / disclaimer

© 2026 BeeHash Cloud — pre-launch.  
Nothing on this site is investment advice. Solo mining is a lottery.
