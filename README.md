# Xender Secrets V2

Multi-category digital products and services website for Xender Secrets.

## Catalog
- Website concepts and demos
- Web novels (coming soon)
- Digital products
- Services
- Projects

Demo concepts are clearly labeled and are not represented as paid client work.

## Layout
- `public/` – static site deployed by the Worker (the only directory served).
- `src/index.js` – Cloudflare Worker API and Durable Objects (see `STORAGE_ARCHITECTURE.md`).
- `reader-server.js` – novel reader backend, deployed separately (Render); `public/novels.html` and `public/reader.html` point at it.
- Deploy with `npm run deploy`.
