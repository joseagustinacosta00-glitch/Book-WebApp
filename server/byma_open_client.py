"""
byma_open_client.py – Open BYMA Data client (direct HTTP).
Provides delayed (~20 min) market data without credentials.
Does NOT depend on PyOBD for bonds (avoids tradeHour bug).

Env vars:
  BYMA_TTL_SECONDS  – cache TTL in seconds (default 60)
"""

import os
import time
import traceback

# ── State ────────────────────────────────────────────────────
_cache = {}        # key -> {"data": ..., "ts": float}
_ttl = None
_sample_keys = None  # stored on first fetch for debugging


def _get_ttl():
    global _ttl
    if _ttl is None:
        _ttl = int(os.environ.get("BYMA_TTL_SECONDS", "120"))
    return _ttl


# ── Cache helpers ────────────────────────────────────────────
def _cache_get(key):
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["ts"] < _get_ttl():
            return entry["data"]
    return None


def _cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ── Core: fetch bonds via direct HTTP ────────────────────────
_BONDS_URLS = [
    "https://open.bymadata.com.ar/vanep/Api/v1/Bonos",
    "https://open.bymadata.com.ar/vanep/Api/v1/bonos",
    "https://open.bymadata.com.ar/vanep/Api/v1/Titulos/Bonos",
]

def _fetch_bonds_raw():
    """Fetch all bonds from Open BYMA API (direct HTTP, no PyOBD).
    Always attempts fetch; returns stale cache on error."""
    global _sample_keys

    cached = _cache_get("bonds_raw")
    if cached is not None:
        return cached

    import requests

    rows = []
    last_error = None

    for url in _BONDS_URLS:
        try:
            r = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (compatible; FinOps/1.0)",
                "Accept": "application/json",
            })
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list):
                    rows = data
                elif isinstance(data, dict) and "data" in data:
                    rows = data["data"] if isinstance(data["data"], list) else []
                elif isinstance(data, dict) and "Content" in data:
                    rows = data["Content"] if isinstance(data["Content"], list) else []
                else:
                    # Maybe single-level dict with values as list
                    for v in data.values():
                        if isinstance(v, list) and len(v) > 0:
                            rows = v
                            break
                    if not rows:
                        rows = [data] if data else []

                if rows:
                    if _sample_keys is None:
                        _sample_keys = list(rows[0].keys())
                        print(f"  Bonds sample keys: {_sample_keys}")
                        print(f"  Bonds sample row: {rows[0]}")
                        print(f"  Bonds total rows: {len(rows)}")
                    _cache_set("bonds_raw", rows)
                    return rows
            else:
                last_error = f"HTTP {r.status_code} from {url}"
        except Exception as e:
            last_error = f"{url}: {e}"

    # If direct HTTP fails, try PyOBD as fallback
    try:
        rows = _fetch_bonds_pyobd()
        if rows:
            _cache_set("bonds_raw", rows)
            return rows
    except Exception as e:
        last_error = f"PyOBD fallback also failed: {e}"

    # All failed: return stale cache if any
    if "bonds_raw" in _cache:
        print(f"  Bonds fetch failed, using stale cache: {last_error}")
        return _cache["bonds_raw"]["data"]

    print(f"✗ Bonds fetch failed: {last_error}")
    return []


def _fetch_bonds_pyobd():
    """Fallback: try PyOBD get_bonds()."""
    global _sample_keys
    try:
        from PyOBD import openBYMAdata
        obd = openBYMAdata()
        result = obd.get_bonds()
        rows = []
        if hasattr(result, "to_dict"):
            rows = result.to_dict("records")
        elif isinstance(result, list):
            rows = result
        if rows and _sample_keys is None:
            _sample_keys = list(rows[0].keys())
            print(f"  PyOBD bonds sample keys: {_sample_keys}")
        return rows
    except Exception as e:
        print(f"  PyOBD fallback error: {e}")
        return []


# ── Defensive field mapping ──────────────────────────────────
# PyOBD field names may vary; try multiple candidates
_FIELD_MAP = {
    "symbol": ["symbol", "simbolo", "ticker", "Symbol", "SYMBOL"],
    "last": ["last", "ultimo", "price", "px_last", "Last", "LAST", "ultimoPrecio"],
    "bid": ["bid", "puntaCompra", "bestBid", "Bid", "BID", "precioCompra"],
    "offer": ["ask", "offer", "puntaVenta", "bestAsk", "Ask", "Offer", "OFFER", "precioVenta"],
    "vol_amount": ["turnover", "monto", "volumenMonto", "amount", "MontoOperado", "montoOperado", "tradeAmount"],
    "vol_vn": ["volume", "volumen", "nominal", "vn", "volumenNominal", "Volume", "VOLUME", "cantidadOperada"],
    "close": ["close", "cierre", "Close"],
    "open": ["open", "apertura", "Open"],
    "high": ["high", "maximo", "High"],
    "low": ["low", "minimo", "Low"],
    "change": ["change", "variacion", "Change"],
    "previous_close": ["previous_close", "cierreAnterior"],
    "bid_size": ["bid_size", "bidSize"],
    "ask_size": ["ask_size", "askSize"],
    "operations": ["operations", "operaciones"],
    "description": ["description", "descripcion", "name", "denominacion", "Descripcion"],
    "settlement": ["settlement", "plazo", "vencimiento", "settl"],
}


def _extract_field(row, field_name):
    """Try multiple candidate keys for a field. Return value or None."""
    candidates = _FIELD_MAP.get(field_name, [field_name])
    for key in candidates:
        if key in row:
            val = row[key]
            if val is not None and val != "":
                return val
    return None


def _safe_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


# ── Public API ───────────────────────────────────────────────

def get_bonds():
    """Return all bonds (cached)."""
    return _fetch_bonds_raw()


def quotes_for(symbols: list[str]) -> dict:
    """Get quotes for specific symbols from Open BYMA data."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return {s: _empty_quote(error=str(e)) for s in symbols}

    # Build a lookup by symbol (case-insensitive)
    lookup = {}
    for row in rows:
        sym = _extract_field(row, "symbol")
        if sym:
            lookup[str(sym).upper().strip()] = row

    results = {}
    for symbol in symbols:
        key = symbol.upper().strip()
        if key in lookup:
            row = lookup[key]
            vol_amount = _safe_float(_extract_field(row, "vol_amount"))
            vol_vn = _safe_float(_extract_field(row, "vol_vn"))
            # VWAP = turnover / volume (if both exist and volume > 0)
            vwap = None
            if vol_amount and vol_vn and vol_vn > 0:
                vwap = round(vol_amount / vol_vn, 4)
            results[symbol] = {
                "last": _safe_float(_extract_field(row, "last")),
                "bid": _safe_float(_extract_field(row, "bid")),
                "offer": _safe_float(_extract_field(row, "offer")),
                "vol_amount": vol_amount,
                "vol_vn": vol_vn,
                "vwap": vwap,
                "close": _safe_float(_extract_field(row, "close")),
                "change": _safe_float(_extract_field(row, "change")),
                "source": "open-bymadata",
            }
        else:
            results[symbol] = _empty_quote(error="symbol not found in Open BYMA")

    return results


def raw_row(symbol: str) -> dict:
    """Return raw row for a symbol (for debugging field names)."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return {"error": str(e)}

    for row in rows:
        sym = _extract_field(row, "symbol")
        if sym and str(sym).upper().strip() == symbol.upper().strip():
            return {
                "symbol": symbol,
                "raw": row,
                "keys": list(row.keys()),
                "sample_keys_on_init": _sample_keys,
            }

    return {
        "symbol": symbol,
        "error": "not found",
        "sample_keys_on_init": _sample_keys,
        "total_rows": len(rows),
    }


def list_bonds(filter_text: str = "", limit: int = 200) -> list:
    """Return simplified list of bonds, optionally filtered."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return []

    results = []
    for row in rows:
        sym = _extract_field(row, "symbol")
        if not sym:
            continue
        sym_str = str(sym).strip()
        if filter_text and filter_text.upper() not in sym_str.upper():
            continue
        results.append({
            "symbol": sym_str,
            "last": _safe_float(_extract_field(row, "last")),
            "description": _extract_field(row, "description") or "",
            "settlement": _extract_field(row, "settlement") or "",
        })

    return sorted(results, key=lambda x: x["symbol"])[:limit]


def health() -> dict:
    """Return health/status info."""
    cached_bonds = _cache.get("bonds_raw")
    return {
        "ok": cached_bonds is not None and len(cached_bonds.get("data", [])) > 0,
        "mode": "direct_http",
        "cache_entries": len(_cache),
        "bonds_cached": cached_bonds is not None,
        "bonds_cached_rows": len(cached_bonds["data"]) if cached_bonds else 0,
        "bonds_cache_age_s": round(time.time() - cached_bonds["ts"], 1) if cached_bonds else None,
        "ttl_seconds": _get_ttl(),
        "sample_keys": _sample_keys,
    }


def _empty_quote(error=None):
    q = {
        "last": None, "bid": None, "offer": None,
        "vol_amount": None, "vol_vn": None, "vwap": None,
        "source": "open-bymadata",
    }
    if error:
        q["error"] = error
    return q


# ── Cauciones (direct HTTP, not in PyOBD) ───────────────────

_CAUCION_URLS = [
    "https://open.bymadata.com.ar/vanep/Api/v1/Cauciones",
    "https://open.bymadata.com.ar/vanep/Api/v1/cauciones",
]
_caucion_sample_keys = None


def get_cauciones() -> list:
    """Fetch cauciones from Open BYMA Data (direct HTTP).
    Returns list of dicts with parsed fields. Cached with TTL.
    Always attempts fetch; returns stale cache on error."""
    global _caucion_sample_keys

    cached = _cache_get("cauciones_raw")
    if cached is not None:
        return cached

    import requests

    rows = []
    last_error = None
    for url in _CAUCION_URLS:
        try:
            r = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (compatible; FinOps/1.0)",
                "Accept": "application/json",
            })
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list):
                    rows = data
                elif isinstance(data, dict) and "data" in data:
                    rows = data["data"] if isinstance(data["data"], list) else []
                elif isinstance(data, dict) and "Content" in data:
                    rows = data["Content"] if isinstance(data["Content"], list) else []
                else:
                    rows = [data] if data else []

                if rows and _caucion_sample_keys is None:
                    _caucion_sample_keys = list(rows[0].keys())
                    print(f"  Cauciones sample keys: {_caucion_sample_keys}")
                    print(f"  Cauciones sample row: {rows[0]}")
                    print(f"  Cauciones total rows: {len(rows)}")

                _cache_set("cauciones_raw", rows)
                return rows
            else:
                last_error = f"HTTP {r.status_code} from {url}"
        except Exception as e:
            last_error = f"{url}: {e}"

    print(f"✗ Cauciones fetch failed: {last_error}")
    _cache_set("cauciones_raw", [])  # cache empty to avoid hammering
    return []


def get_cauciones_parsed(max_days: int = 7) -> dict:
    """Return cauciones parsed by currency (ARS/USD) and days.
    Returns { "ars": [...], "usd": [...], "raw_sample_keys": [...] }
    """
    rows = get_cauciones()
    if not rows:
        return {"ars": [], "usd": [], "raw_sample_keys": _caucion_sample_keys, "error": "No data"}

    # Defensive field candidates for cauciones
    _C_FIELDS = {
        "days": ["days", "dias", "plazo", "Plazo", "diasVenc", "DaysToMaturity", "cantDias", "plazoStr"],
        "currency": ["currency", "moneda", "Moneda", "currencyId", "denominationCcy"],
        "rate_vwap": ["vwap", "tasaVWAP", "tnaVWAP", "rateVwap", "tasaProm", "VWAP", "precioPromPonderado"],
        "rate_last": ["last", "ultimo", "tasa", "Last", "rate", "tasaUltima"],
        "rate_bid": ["bid", "puntaCompra", "bestBid", "Bid", "tasaCompra"],
        "rate_offer": ["offer", "puntaVenta", "bestAsk", "ask", "tasaVenta", "Offer"],
        "monto": ["monto", "amount", "montoOperado", "MontoOperado", "tradeAmount", "vol_amount"],
        "symbol": ["symbol", "simbolo", "ticker", "Symbol", "description", "descripcion"],
    }

    def _get(row, field):
        for key in _C_FIELDS.get(field, [field]):
            if key in row:
                val = row[key]
                if val is not None and val != "":
                    return val
        return None

    ars_list = []
    usd_list = []

    for row in rows:
        days_raw = _get(row, "days")
        days = None
        if days_raw is not None:
            try:
                days = int(float(str(days_raw)))
            except:
                pass

        if days is not None and days > max_days:
            continue

        currency = str(_get(row, "currency") or "").upper()
        is_usd = "USD" in currency or "D" in currency or "U$S" in currency or "DOLAR" in currency

        parsed = {
            "days": days,
            "currency_raw": _get(row, "currency"),
            "rate_vwap": _safe_float(_get(row, "rate_vwap")),
            "rate_last": _safe_float(_get(row, "rate_last")),
            "rate_bid": _safe_float(_get(row, "rate_bid")),
            "rate_offer": _safe_float(_get(row, "rate_offer")),
            "monto": _safe_float(_get(row, "monto")),
            "symbol": _get(row, "symbol"),
        }

        if is_usd:
            usd_list.append(parsed)
        else:
            ars_list.append(parsed)

    ars_list.sort(key=lambda x: x["days"] or 999)
    usd_list.sort(key=lambda x: x["days"] or 999)

    return {
        "ars": ars_list,
        "usd": usd_list,
        "raw_sample_keys": _caucion_sample_keys,
    }


def raw_caucion() -> dict:
    """Return raw cauciones data for debugging."""
    rows = get_cauciones()
    return {
        "total_rows": len(rows),
        "sample_keys": _caucion_sample_keys,
        "first_5": rows[:5] if rows else [],
    }

