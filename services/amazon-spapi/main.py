import hmac
import os
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

APP_NAME = os.getenv("APP_NAME", "Xender Seller Manager Connector")
APP_VERSION = os.getenv("APP_VERSION", "1.2.0")

LWA_CLIENT_ID = os.getenv("LWA_CLIENT_ID", "")
LWA_CLIENT_SECRET = os.getenv("LWA_CLIENT_SECRET", "")
LWA_REFRESH_TOKEN = os.getenv("LWA_REFRESH_TOKEN", "")
SELLER_ID = os.getenv("SELLER_ID", "")
MARKETPLACE_ID = os.getenv("MARKETPLACE_ID", "")
SP_API_ENDPOINT = os.getenv(
    "SP_API_ENDPOINT",
    "https://sellingpartnerapi-eu.amazon.com",
).rstrip("/")

CONNECTOR_API_KEY = os.getenv("CONNECTOR_API_KEY", "")

LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"

app = FastAPI(
    title="Amazon SP-API Listing Connector",
    version=APP_VERSION,
    description="Private connector for creating and managing Amazon listings through SP-API.",
)

_token_cache = {
    "access_token": None,
    "expires_at": 0.0,
}


def require_config():
    missing = []

    config = {
        "LWA_CLIENT_ID": LWA_CLIENT_ID,
        "LWA_CLIENT_SECRET": LWA_CLIENT_SECRET,
        "LWA_REFRESH_TOKEN": LWA_REFRESH_TOKEN,
        "SELLER_ID": SELLER_ID,
        "MARKETPLACE_ID": MARKETPLACE_ID,
    }

    for key, value in config.items():
        if not value:
            missing.append(key)

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing environment variables: {', '.join(missing)}",
        )


def verify_connector_key(x_connector_key: Optional[str]):
    # XEND-HQ-001: fail closed. This code is public now, so an unset key must never mean
    # "open to anyone" — every /amazon/* route can read or change live listings.
    if not CONNECTOR_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Connector is locked: set CONNECTOR_API_KEY on the server.",
        )
    if not x_connector_key or not hmac.compare_digest(x_connector_key, CONNECTOR_API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Invalid connector API key",
        )


def safe_json(response: httpx.Response):
    try:
        return response.json()
    except Exception:
        return response.text[:2000]


async def get_lwa_access_token():
    require_config()

    now = time.time()

    if (
        _token_cache["access_token"]
        and now < _token_cache["expires_at"] - 60
    ):
        return _token_cache["access_token"]

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            LWA_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": LWA_REFRESH_TOKEN,
                "client_id": LWA_CLIENT_ID,
                "client_secret": LWA_CLIENT_SECRET,
            },
            headers={
                "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "LWA token exchange failed",
                "amazon": safe_json(response),
            },
        )

    data = response.json()

    token = data["access_token"]
    expires_in = int(data.get("expires_in", 3600))

    _token_cache["access_token"] = token
    _token_cache["expires_at"] = now + expires_in

    return token


async def spapi_request(
    method: str,
    path: str,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
):
    access_token = await get_lwa_access_token()

    headers = {
        "x-amz-access-token": access_token,
        "x-amz-date": time.strftime(
            "%Y%m%dT%H%M%SZ",
            time.gmtime(),
        ),
        "user-agent": f"{APP_NAME}/{APP_VERSION} (Language=Python)",
        "accept": "application/json",
    }

    if json_body is not None:
        headers["content-type"] = "application/json"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.request(
            method,
            f"{SP_API_ENDPOINT}{path}",
            params=params,
            json=json_body,
            headers=headers,
        )

    result = {
        "status_code": response.status_code,
        "headers": {
            "x-amzn-requestid":
                response.headers.get("x-amzn-requestid"),
            "x-amzn-ratelimit-limit":
                response.headers.get("x-amzn-ratelimit-limit"),
        },
        "body": safe_json(response),
    }

    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=result,
        )

    return result


class CreateListingRequest(BaseModel):
    sku: str = Field(..., min_length=1, max_length=40)
    productType: str = Field(..., min_length=1)
    attributes: Dict[str, Any]
    requirements: str = "LISTING"
    issueLocale: Optional[str] = "en_IN"


class PatchOperation(BaseModel):
    op: str
    path: str
    value: Any


class PatchListingRequest(BaseModel):
    productType: str
    patches: List[PatchOperation]
    issueLocale: Optional[str] = "en_IN"


@app.get("/")
async def root():
    return {
        "ok": True,
        "name": APP_NAME,
        "version": APP_VERSION,
        "message": "Amazon SP-API connector is running",
    }


@app.get("/health")
async def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "version": APP_VERSION,
        "endpoint": SP_API_ENDPOINT,
        "configured": all(
            [
                LWA_CLIENT_ID,
                LWA_CLIENT_SECRET,
                LWA_REFRESH_TOKEN,
                SELLER_ID,
                MARKETPLACE_ID,
            ]
        ),
    }


@app.get("/amazon/connection-test")
async def connection_test(
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)

    token = await get_lwa_access_token()

    return {
        "ok": True,
        "message": "LWA token exchange succeeded",
        "access_token_returned": False,
        "token_length": len(token),
    }


@app.get("/amazon/marketplaces")
async def marketplaces(
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)

    return await spapi_request(
        "GET",
        "/sellers/v1/marketplaceParticipations",
    )


@app.get("/amazon/listings")
async def search_listings(
    page_size: int = Query(10, ge=1, le=20),
    page_token: Optional[str] = None,
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_seller = quote(SELLER_ID, safe="")

    params = {
        "marketplaceIds": MARKETPLACE_ID,
        "pageSize": page_size,
        "includedData":
            "summaries,issues,offers,fulfillmentAvailability",
    }

    if page_token:
        params["pageToken"] = page_token

    return await spapi_request(
        "GET",
        f"/listings/2021-08-01/items/{safe_seller}",
        params=params,
    )


@app.get("/amazon/listings/{sku}")
async def get_listing(
    sku: str,
    included_data: str = Query(
        "summaries,attributes,issues,offers,fulfillmentAvailability"
    ),
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_seller = quote(SELLER_ID, safe="")
    safe_sku = quote(sku, safe="")

    return await spapi_request(
        "GET",
        f"/listings/2021-08-01/items/"
        f"{safe_seller}/{safe_sku}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "includedData": included_data,
            "issueLocale": "en_IN",
        },
    )


@app.get("/amazon/catalog/search")
async def search_catalog(
    keywords: str,
    page_size: int = Query(10, ge=1, le=20),
    page_token: Optional[str] = None,
    x_connector_key: Optional[str] = Header(default=None),
):
    """
    Search Amazon's existing catalog before creating a brand-new ASIN.
    Use this to find an exact existing product match and prefer an
    offer-only listing when possible.
    """
    verify_connector_key(x_connector_key)
    require_config()

    params = {
        "marketplaceIds": MARKETPLACE_ID,
        "keywords": keywords,
        "pageSize": page_size,
        "includedData": (
            "summaries,identifiers,images,productTypes,"
            "salesRanks,attributes"
        ),
    }

    if page_token:
        params["pageToken"] = page_token

    return await spapi_request(
        "GET",
        "/catalog/2022-04-01/items",
        params=params,
    )


@app.get("/amazon/product-types/search")
async def search_product_types(
    keywords: Optional[str] = None,
    item_name: Optional[str] = None,
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    params = {
        "marketplaceIds": MARKETPLACE_ID,
        "locale": "en_IN",
    }

    if keywords:
        params["keywords"] = keywords

    if item_name:
        params["itemName"] = item_name

    return await spapi_request(
        "GET",
        "/definitions/2020-09-01/productTypes",
        params=params,
    )


@app.get("/amazon/product-types/{product_type}")
async def get_product_type_definition(
    product_type: str,
    requirements: str = "LISTING",
    parentage_level: str = "NONE",
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_pt = quote(product_type, safe="")

    return await spapi_request(
        "GET",
        f"/definitions/2020-09-01/productTypes/{safe_pt}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "sellerId": SELLER_ID,
            "requirements": requirements,
            "requirementsEnforced": "ENFORCED",
            "locale": "en_IN",
            "parentageLevel": parentage_level,
        },
    )


@app.post("/amazon/listings/validate")
async def validate_listing(
    payload: CreateListingRequest,
    x_connector_key: Optional[str] = Header(default=None),
):
    """
    Validate a full listing payload in Amazon production validation mode
    without persisting the SKU/listing to the Amazon catalog.
    """
    verify_connector_key(x_connector_key)
    require_config()

    safe_seller = quote(SELLER_ID, safe="")
    safe_sku = quote(payload.sku, safe="")

    return await spapi_request(
        "PUT",
        f"/listings/2021-08-01/items/"
        f"{safe_seller}/{safe_sku}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "issueLocale": payload.issueLocale or "en_IN",
            "mode": "VALIDATION_PREVIEW",
        },
        json_body={
            "productType": payload.productType,
            "requirements": payload.requirements,
            "attributes": payload.attributes,
        },
    )


@app.post("/amazon/listings/create")
async def create_listing(
    payload: CreateListingRequest,
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_seller = quote(SELLER_ID, safe="")
    safe_sku = quote(payload.sku, safe="")

    return await spapi_request(
        "PUT",
        f"/listings/2021-08-01/items/"
        f"{safe_seller}/{safe_sku}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "issueLocale":
                payload.issueLocale or "en_IN",
        },
        json_body={
            "productType": payload.productType,
            "requirements": payload.requirements,
            "attributes": payload.attributes,
        },
    )


@app.patch("/amazon/listings/{sku}")
async def patch_listing(
    sku: str,
    payload: PatchListingRequest,
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_seller = quote(SELLER_ID, safe="")
    safe_sku = quote(sku, safe="")

    return await spapi_request(
        "PATCH",
        f"/listings/2021-08-01/items/"
        f"{safe_seller}/{safe_sku}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "issueLocale":
                payload.issueLocale or "en_IN",
        },
        json_body={
            "productType": payload.productType,
            "patches": [
                patch.model_dump()
                for patch in payload.patches
            ],
        },
    )
@app.get("/amazon/product-types/{product_type}/schema-summary")
async def get_product_type_schema_summary(
    product_type: str,
    x_connector_key: Optional[str] = Header(default=None),
):
    verify_connector_key(x_connector_key)
    require_config()

    safe_pt = quote(product_type, safe="")

    definition = await spapi_request(
        "GET",
        f"/definitions/2020-09-01/productTypes/{safe_pt}",
        params={
            "marketplaceIds": MARKETPLACE_ID,
            "sellerId": SELLER_ID,
            "requirements": "LISTING",
            "requirementsEnforced": "ENFORCED",
            "locale": "en_IN",
            "parentageLevel": "NONE",
        },
    )

    try:
        schema_url = definition["body"]["schema"]["link"]["resource"]
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Schema URL not found in Amazon response",
        )

    async with httpx.AsyncClient(
        timeout=60,
        follow_redirects=True,
    ) as client:
        response = await client.get(schema_url)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail="Unable to download Amazon product schema",
        )

    schema = response.json()

    required = schema.get("required", [])
    properties = schema.get("properties", {})

    important_names = set(required) | {
        "item_name",
        "brand",
        "manufacturer",
        "supplier_declared_has_product_identifier_exemption",
        "externally_assigned_product_identifier",
        "product_description",
        "bullet_point",
        "generic_keyword",
        "material",
        "color",
        "size",
        "number_of_items",
        "number_of_pieces",
        "item_package_quantity",
        "unit_count",
        "country_of_origin",
        "batteries_required",
        "batteries_included",
        "condition_type",
        "purchasable_offer",
        "fulfillment_availability",
        "item_package_dimensions",
        "item_package_weight",
        "main_product_image_locator",
    }

    selected_properties = {
        name: properties[name]
        for name in important_names
        if name in properties
    }

    return {
        "productType": product_type,
        "required": required,
        "importantProperties": selected_properties,
        "conditionalRuleCount": len(schema.get("allOf", [])),
    }
