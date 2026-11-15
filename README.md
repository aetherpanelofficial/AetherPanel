# AetherPanel (source)

Private source for the AetherPanel control plane. Builds signed release
bundles and publishes them to `aetherpanelofficial/aetherpanel`, which is the public
distribution repo (installer + release artifacts only).

## Layout

- `src/`, `server/` — panel source, compiled by `npm run build` into `dist/`
- `daemon/` — node agent, compiled to `daemon/agent.js` in CI
- `public/` — static assets
- `keys/` — release signing public key
- `.github/workflows/build.yml` — bundle + sign + publish pipeline

## Required secrets

| Secret | Purpose |
| :-- | :-- |
| `MINISIGN_SECRET_KEY` | signs `SHA256SUMS` |
| `RELEASE_PAT` | fine-grained PAT, `Contents: Read and write` on the public repo only |

## Bundle contract

CI ships `dist/`, `node_modules/`, `daemon/agent.js`, `public/`, `package.json`,
`.env.example`. Nothing else. No `src/`, no `server/`, no `.map` files — the
public install must never expose source.

## Local build

    npm ci
    npm run build
