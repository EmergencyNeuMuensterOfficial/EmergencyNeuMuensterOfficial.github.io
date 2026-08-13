# OnboardX Status Page

A standalone status page for the OnboardX Discord bot.

It reads **directly from the same MongoDB database** the bot writes its cluster/shard
heartbeats to (`system_docs`, `cluster_statuses`, `shard_statuses`, `guild_configs`).
There is **no external API** involved — no dependency on `api.js` or the bot process.

## Requirements

- Node.js 18.17+
- Access to the MongoDB instance used by the bot (the bot's `.env` at the repo root holds `MONGODB_URI` / `MONGODB_DATABASE`)

## Setup

```bash
cd website
npm install
```

Copy `.env.example` to `.env` and point it at your MongoDB:

```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=OnboardX
```

## Run

```bash
npm run dev      # development on http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

## How it works

1. The bot's cluster manager writes heartbeat snapshots into MongoDB
   (`system_docs` document `clusterStatus`, `cluster_statuses`, `shard_statuses`).
2. `/api/status` reads those collections on demand and normalizes them.
3. The status page polls `/api/status` every 30 seconds and renders overall
   health, services, metrics, clusters and shards.

A document is treated as **stale/offline** once its `expiresAt` timestamp passes,
so the page automatically reports an outage if the bot stops writing heartbeats.

## API

- `GET /api/status` — full normalized status payload (used by the page).

## Notes

- Port is `3000` (change via the `start`/`dev` scripts if needed).
- Requires no other part of the repo to run.
