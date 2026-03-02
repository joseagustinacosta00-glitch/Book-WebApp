"""
mae_client.py – MAE Market Data API client.
Uses API keys to fetch real-time bond prices from marketdata.mae.com.ar.

Env vars:
  MAE_API_KEY        – Production API key
  MAE_API_KEY_UAT    – UAT API key (fallback)
  MAE_TTL_SECONDS    – cache TTL in seconds (default 120)
"""

import os
import time
import json
import traceback

# ── State ────────────────────────────────────────────────────
_cache = {}
_ttl = None
_discovered_endpoints = {}  # name -> url
_discovery_done = False
_discovery_log = []
_sample_response = None

BASE_PROD = "https://marketdata.mae.com.ar"
BASE_UAT = "https://marketdata-uat.mae.com.ar"


def _get_ttl():
    global _ttl
    if _ttl is None:
        _ttl = int(os.environ.get("MAE_TTL_SECONDS", "120"))
    return _ttl


def _get_api_key():
    return os.environ.get("MAE_API_KEY", "nuDX73vj2483KSUgvenkj9t50oA0vgvA4WcuRAER")


def _get_api_key_uat():
    return os.environ.get("MAE_API_KEY_UAT", "1ypnPqtlG64lJIjrRN0DNut0hlIcQ502MiAbyo2g")


def _cache_get(key):
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["ts"] < _get_ttl():
            return entry["data"]
    return None


def _cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ── API Request helper ───────────────────────────────────────
def _mae_request(url, api_key=None, timeout=10):
    """Make authenticated request to MAE API. Returns (status_code, data_or_text)."""
    import requests
    if api_key is None:
        api_key = _get_api_key()

    headers = {
        "Accept": "application/json",
        "User-Agent": "FinOps/1.0",
    }

    # Try different auth methods
    auth_variants = [
        {"x-api-key": api_key},
        {"apiKey": api_key},
        {"Authorization": f"Bearer {api_key}"},
        {"Authorization": api_key},
        {"api-key": api_key},
        {"X-API-KEY": api_key},
    ]

    for auth_headers in auth_variants:
        try:
            h = {**headers, **auth_headers}
            r = requests.get(url, headers=h, timeout=timeout)
            if r.status_code == 200:
                try:
                    data = r.json()
                    return (200, data, auth_headers)
                except:
                    return (200, r.text[:500], auth_headers)
            elif r.status_code not in (401, 403):
                # Not an auth error, no point trying other auth methods
                try:
                    return (r.status_code, r.json(), auth_headers)
                except:
                    return (r.status_code, r.text[:500], auth_headers)
        except requests.exceptions.Timeout:
            return (-1, "Timeout", auth_headers)
        except requests.exceptions.ConnectionError as e:
            return (-2, f"Connection error: {e}", auth_headers)
        except Exception as e:
            return (-3, f"Error: {e}", auth_headers)

    return (401, "All auth methods failed", {})


# ── Endpoint Discovery ───────────────────────────────────────
def discover_endpoints():
    """Try many possible endpoint patterns to find working MAE API endpoints.
    Call once at startup. Logs all results."""
    global _discovered_endpoints, _discovery_done, _discovery_log, _sample_response

    if _discovery_done:
        return _discovered_endpoints

    _discovery_done = True
    _discovery_log = []

    # Also try query param auth
    api_key = _get_api_key()
    api_key_uat = _get_api_key_uat()

    # Candidate endpoints to try
    candidates = [
        # Swagger/OpenAPI spec
        ("swagger_json", "/swagger/swagger.json"),
        ("swagger_v1", "/swagger/v1/swagger.json"),
        ("openapi", "/openapi.json"),
        ("api_docs", "/api-docs"),

        # Common REST patterns for bonds/fixed income
        ("cotizaciones", "/api/cotizaciones"),
        ("cotizaciones_v1", "/api/v1/cotizaciones"),
        ("bonos", "/api/bonos"),
        ("bonos_v1", "/api/v1/bonos"),
        ("renta_fija", "/api/rentafija"),
        ("renta_fija_v1", "/api/v1/rentafija"),
        ("renta_fija_2", "/api/RentaFija"),
        ("renta_fija_3", "/api/v1/RentaFija"),
        ("titulos", "/api/titulos"),
        ("titulos_v1", "/api/v1/titulos"),
        ("titulos_pub", "/api/titulospublicos"),
        ("titulos_pub_v1", "/api/v1/TitulosPublicos"),

        # Precios
        ("precios", "/api/precios"),
        ("precios_v1", "/api/v1/precios"),
        ("precios_cierre", "/api/preciosdecierre"),
        ("precios_cierre_v1", "/api/v1/PreciosDeCierre"),
        ("resumen", "/api/resumen"),
        ("resumen_v1", "/api/v1/resumen"),
        ("resumen_final", "/api/ResumenFinal"),

        # Market data patterns
        ("marketdata", "/api/marketdata"),
        ("md", "/api/md"),
        ("quotes", "/api/quotes"),
        ("quotes_v1", "/api/v1/quotes"),
        ("real_time", "/api/realtime"),
        ("real_time_v1", "/api/v1/RealTime"),

        # Cauciones
        ("cauciones", "/api/cauciones"),
        ("cauciones_v1", "/api/v1/cauciones"),
        ("repo", "/api/repo"),

        # Health/status
        ("health", "/api/health"),
        ("status", "/api/status"),
        ("version", "/api/version"),

        # Root API
        ("api_root", "/api"),
        ("api_v1_root", "/api/v1"),
    ]

    print("\n" + "=" * 60)
    print("MAE API ENDPOINT DISCOVERY")
    print(f"Base: {BASE_PROD}")
    print(f"API Key (first 8): {api_key[:8]}...")
    print("=" * 60)

    for name, path in candidates:
        url = BASE_PROD + path
        status, data, auth = _mae_request(url)
        result = {
            "name": name,
            "url": url,
            "status": status,
            "auth_method": list(auth.keys())[0] if auth else "none",
            "response_preview": str(data)[:200] if data else None,
        }
        _discovery_log.append(result)

        if status == 200:
            _discovered_endpoints[name] = {
                "url": url,
                "auth": auth,
                "sample": str(data)[:500],
            }
            if _sample_response is None and isinstance(data, (list, dict)):
                _sample_response = data
            print(f"  ✓ {name}: {path} → 200 OK (auth: {result['auth_method']})")
            print(f"    Preview: {str(data)[:200]}")
        elif status > 0:
            print(f"  ✗ {name}: {path} → HTTP {status}")
        else:
            print(f"  ✗ {name}: {path} → {data}")

    # Also try with UAT key and base
    print(f"\nTrying UAT base: {BASE_UAT}")
    for name, path in [("uat_bonos", "/api/bonos"), ("uat_renta", "/api/rentafija"),
                        ("uat_cotizaciones", "/api/cotizaciones"), ("uat_api", "/api"),
                        ("uat_v1", "/api/v1")]:
        url = BASE_UAT + path
        status, data, auth = _mae_request(url, api_key=api_key_uat)
        result = {
            "name": name,
            "url": url,
            "status": status,
            "auth_method": list(auth.keys())[0] if auth else "none",
            "response_preview": str(data)[:200] if data else None,
        }
        _discovery_log.append(result)
        if status == 200:
            _discovered_endpoints[name] = {
                "url": url,
                "auth": auth,
                "sample": str(data)[:500],
            }
            print(f"  ✓ {name}: {url} → 200 OK")
        elif status > 0:
            print(f"  ✗ {name}: {url} → HTTP {status}")

    # Also try with query param auth
    print(f"\nTrying query param auth...")
    for qp in ["apiKey", "api_key", "key", "token"]:
        url = f"{BASE_PROD}/api/bonos?{qp}={api_key}"
        status, data, auth = _mae_request(url)
        if status == 200:
            print(f"  ✓ Query param '{qp}' works!")
            _discovered_endpoints[f"qp_{qp}"] = {"url": url, "auth": {qp: "query"}}

    print(f"\n{'=' * 60}")
    print(f"Discovery complete: {len(_discovered_endpoints)} endpoints found")
    if _discovered_endpoints:
        for name, ep in _discovered_endpoints.items():
            print(f"  {name}: {ep['url']}")
    print("=" * 60 + "\n")

    return _discovered_endpoints


# ── Public API ───────────────────────────────────────────────
def health():
    """Return health/status info."""
    return {
        "ok": len(_discovered_endpoints) > 0,
        "discovery_done": _discovery_done,
        "endpoints_found": len(_discovered_endpoints),
        "endpoints": {k: v["url"] for k, v in _discovered_endpoints.items()},
        "api_key_set": bool(_get_api_key()),
        "cache_entries": len(_cache),
        "ttl_seconds": _get_ttl(),
    }


def discovery_results():
    """Return full discovery log for debugging."""
    if not _discovery_done:
        discover_endpoints()
    return {
        "endpoints_found": _discovered_endpoints,
        "discovery_log": _discovery_log,
        "sample_response": str(_sample_response)[:2000] if _sample_response else None,
    }


def get_bonds_raw():
    """Fetch bond data from discovered MAE endpoints."""
    cached = _cache_get("mae_bonds")
    if cached is not None:
        return cached

    if not _discovery_done:
        discover_endpoints()

    # Try each discovered endpoint that looks like bonds data
    bond_endpoints = [k for k in _discovered_endpoints
                      if any(x in k for x in ["bono", "renta", "cotizacion", "titulo", "precio", "resumen", "marketdata", "quotes", "real_time"])]

    for name in bond_endpoints:
        ep = _discovered_endpoints[name]
        status, data, auth = _mae_request(ep["url"])
        if status == 200 and isinstance(data, list) and len(data) > 0:
            _cache_set("mae_bonds", data)
            return data
        elif status == 200 and isinstance(data, dict):
            # Maybe data is nested
            for key in ["data", "bonos", "cotizaciones", "titulos", "items", "result", "results"]:
                if key in data and isinstance(data[key], list):
                    _cache_set("mae_bonds", data[key])
                    return data[key]

    return []


def quotes_for(symbols: list) -> dict:
    """Get quotes for specific symbols from MAE data."""
    bonds = get_bonds_raw()
    if not bonds:
        return {s: {"error": "MAE: no bond data available"} for s in symbols}

    result = {}
    for sym in symbols:
        sym_upper = sym.upper()
        # Find matching bond in raw data
        found = None
        for b in bonds:
            # Try common field names for ticker/symbol
            for field in ["symbol", "ticker", "simbolo", "especie", "Symbol", "Ticker", "Simbolo", "Especie", "denominacion", "codigo"]:
                val = b.get(field, "")
                if isinstance(val, str) and sym_upper in val.upper():
                    found = b
                    break
            if found:
                break

        if found:
            # Extract price fields (try many variants)
            def get_num(row, *fields):
                for f in fields:
                    v = row.get(f)
                    if v is not None:
                        try:
                            return float(v)
                        except (ValueError, TypeError):
                            pass
                return None

            result[sym] = {
                "last": get_num(found, "last", "ultimo", "Last", "Ultimo", "precio", "Precio", "precioUltimo", "PrecioUltimo", "px"),
                "bid": get_num(found, "bid", "compra", "Bid", "Compra", "precioCompra", "PrecioCompra"),
                "offer": get_num(found, "offer", "ask", "venta", "Offer", "Ask", "Venta", "precioVenta", "PrecioVenta"),
                "vwap": get_num(found, "vwap", "Vwap", "VWAP", "ppp", "PPP", "precioPromedio", "PrecioPromedio", "promedio"),
                "vol_vn": get_num(found, "volume", "volumen", "Volume", "Volumen", "cantidad", "Cantidad", "cantidadNominal"),
                "vol_amount": get_num(found, "monto", "Monto", "montoOperado", "MontoOperado", "turnover"),
                "source": "MAE",
                "raw_keys": list(found.keys())[:15],
            }
        else:
            result[sym] = {"error": f"Not found in MAE data", "source": "MAE"}

    return result


def raw_data():
    """Return raw MAE data for debugging."""
    bonds = get_bonds_raw()
    return {
        "total": len(bonds),
        "sample": bonds[:3] if bonds else [],
        "sample_keys": list(bonds[0].keys()) if bonds else [],
    }
