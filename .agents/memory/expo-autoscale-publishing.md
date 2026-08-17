---
name: Expo autoscale publishing
description: Production deployment rule for Expo web exports served through the Express backend.
---

The autoscale run command must explicitly set `NODE_ENV=production` when starting the bundled Express server.

**Why:** Without it, the server enables the development-only Metro proxy. Metro is not started by the production run command, so the default `/` health check returns proxy errors and publishing fails even when the web export and server bundle build successfully.

**How to apply:** For deployments that build `expo export --platform web` and serve it through `server/index.ts`, run the bundled server with `env NODE_ENV=production node ...` and locally verify `GET /` returns HTTP 200.