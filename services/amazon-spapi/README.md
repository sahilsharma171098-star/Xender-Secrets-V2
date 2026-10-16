# Xender Seller Manager — Amazon SP-API connector

Private FastAPI service that lets Xender's agents read and manage Amazon (India) listings through
Amazon's Selling Partner API. Moved here from the `xender-amazon-spapi` repo in XEND-HQ-001
(code snapshot of `0b998b2`; the old repo keeps the full history and stays private).

## What it does

| Route | Purpose |
| --- | --- |
| `GET /`, `GET /health` | liveness + whether all env vars are present (no values shown) |
| `GET /amazon/connection-test` | proves the LWA token exchange works |
| `GET /amazon/marketplaces` | seller's marketplace participations |
| `GET /amazon/listings`, `GET /amazon/listings/{sku}` | read listings |
| `GET /amazon/catalog/search` | find an existing ASIN before creating a duplicate |
| `GET /amazon/product-types/...` | product-type search, definition and compact schema summary |
| `POST /amazon/listings/validate` | `VALIDATION_PREVIEW` — checks a listing without publishing |
| `POST /amazon/listings/create`, `PATCH /amazon/listings/{sku}` | **live changes** — need Sahil's approval |

Every `/amazon/*` route needs the `X-Connector-Key` header. Since XEND-HQ-001 the service
**fails closed**: if `CONNECTOR_API_KEY` is not set on the server, those routes return 503
instead of being open.

## Configuration (server environment only — never commit values)

`LWA_CLIENT_ID`, `LWA_CLIENT_SECRET`, `LWA_REFRESH_TOKEN`, `SELLER_ID`, `MARKETPLACE_ID`,
`CONNECTOR_API_KEY` (long random string), optional `SP_API_ENDPOINT`
(default `https://sellingpartnerapi-eu.amazon.com`, which serves India).

## Run locally

```bash
cd services/amazon-spapi
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Deploy (Render, free plan)

The live service still deploys from the old `xender-amazon-spapi` repo. To deploy from here
instead: Render → the service → Settings → set the repository to `Xender-Secrets-V2`,
**Root Directory** `services/amazon-spapi`, build `pip install -r requirements.txt`, start
`uvicorn main:app --host 0.0.0.0 --port $PORT`. Make sure `CONNECTOR_API_KEY` is set first.

## Rules for agents

- Read-only routes and `validate` are fine to call for research.
- `create` and `PATCH` change what customers see on Amazon: draft the payload, run
  `validate`, show Sahil the result, and only send the live call after he says yes.
- Manufacturer/packer details (addresses, phone numbers, emails) belong in the request
  payload at call time, not in this code.
