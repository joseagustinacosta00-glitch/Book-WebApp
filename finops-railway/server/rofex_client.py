"""
rofex_client.py – Wrapper around pyRofex for Veta xOMS (Primary API).

Env vars:
  ROFEX_USER          – CUIT or user
  ROFEX_PASSWORD      – password
  ROFEX_ACCOUNT       – account number
  ROFEX_ENV           – LIVE | REMARKET  (default REMARKET)
  ROFEX_REST_URL      – (optional) custom REST endpoint, e.g. https://api.veta.xoms.com.ar
  ROFEX_WS_URL        – (optional) custom WS endpoint, e.g. wss://api.cocos.xoms.com.ar
                         If only REST is set, WS defaults to same host with wss://
                         If neither is set, pyRofex defaults are used.
"""

import os
import traceback
import pyRofex

# ── Module state ─────────────────────────────────────────────
_initialized = False
_init_error = None
_instrument_map = {}   # short_name -> full_ticker
_env_label = "UNKNOWN"
_rest_url = None
_ws_url = None


# ── 1) Initialize: respect ROFEX_ENV, custom endpoints ──────
def initialize():
    global _initialized, _init_error, _instrument_map, _env_label, _rest_url, _ws_url
    if _initialized:
        return

    user = os.environ.get("ROFEX_USER")
    password = os.environ.get("ROFEX_PASSWORD")
    account = os.environ.get("ROFEX_ACCOUNT")
    env_str = os.environ.get("ROFEX_ENV", "REMARKET").upper()

    if not all([user, password, account]):
        _init_error = "Missing ROFEX credentials (ROFEX_USER, ROFEX_PASSWORD, ROFEX_ACCOUNT)."
        raise RuntimeError(_init_error)

    # Resolve environment enum
    if env_str == "LIVE":
        environment = pyRofex.Environment.LIVE
    else:
        environment = pyRofex.Environment.REMARKET
    _env_label = env_str

    # ── 2) Custom endpoints: read from env, normalize ────────
    raw_rest = os.environ.get("ROFEX_REST_URL", "").strip().rstrip("/")
    raw_ws = os.environ.get("ROFEX_WS_URL", "").strip().rstrip("/")

    try:
        # Set custom endpoints BEFORE initialize (which authenticates)
        if raw_rest:
            rest_url = raw_rest + "/"  # pyRofex expects trailing slash
            pyRofex._set_environment_parameter("url", rest_url, environment)
            _rest_url = rest_url
            print(f"  Custom REST endpoint: {rest_url}")

            # If WS not explicitly set, derive from REST host
            if not raw_ws:
                # https://api.veta.xoms.com.ar -> wss://api.veta.xoms.com.ar
                ws_derived = rest_url.replace("https://", "wss://").replace("http://", "ws://")
                pyRofex._set_environment_parameter("ws", ws_derived, environment)
                _ws_url = ws_derived
                print(f"  Derived WS endpoint: {ws_derived}")

        if raw_ws:
            ws_url = raw_ws + "/"
            pyRofex._set_environment_parameter("ws", ws_url, environment)
            _ws_url = ws_url
            print(f"  Custom WS endpoint: {ws_url}")

        # Authenticate using the correct environment
        pyRofex.initialize(
            user=user,
            password=password,
            account=account,
            environment=environment,
        )
        _initialized = True
        _init_error = None
        print(f"✓ pyRofex initialized (env={env_str})")

        # ── 3) Sanity check: confirm auth works ─────────────
        try:
            segments = pyRofex.get_segments()
            seg_list = segments.get("segments", [])
            print(f"  Sanity check OK – {len(seg_list)} segments found")
        except Exception as e:
            print(f"  ⚠ Sanity check (get_segments) failed: {e}")

        # ── 4) Instrument map: non-blocking ─────────────────
        _build_instrument_map()

    except Exception as e:
        _init_error = f"pyRofex init failed: {e}"
        print(f"✗ {_init_error}")
        raise


# ── 4) Instrument map ───────────────────────────────────────
def _build_instrument_map():
    """
    Fetch all instruments and build short_name -> full_ticker lookup.
    Non-blocking: if it fails, we log and continue.
    """
    global _instrument_map
    try:
        instruments = pyRofex.get_all_instruments()
        all_inst = instruments.get("instruments", [])
        print(f"  Instruments: {len(all_inst)} found")

        _instrument_map = {}
        for inst in all_inst:
            ticker = inst.get("instrumentId", {}).get("symbol", "")
            if not ticker:
                continue

            # Store full ticker -> itself
            _instrument_map[ticker] = ticker

            # Parse "MERV - XMEV - AL30 - CI" format
            parts = [p.strip() for p in ticker.split(" - ")]
            if len(parts) >= 3:
                short = parts[2]  # e.g. "AL30"
                suffix = parts[3] if len(parts) > 3 else ""

                # Map base short name to CI (contado inmediato) by default
                if suffix in ("CI", "") and short not in _instrument_map:
                    _instrument_map[short] = ticker

                # Also store with suffix: "AL30-CI", "AL30-48hs"
                if suffix:
                    _instrument_map[f"{short}-{suffix}"] = ticker
            else:
                # Simple format: store as-is
                _instrument_map[ticker] = ticker

        print(f"  Instrument map: {len(_instrument_map)} entries")
        # Print examples
        for ex in ["AL30", "AL30D", "GD30", "GD30D", "GGAL"]:
            if ex in _instrument_map:
                print(f"    {ex} -> {_instrument_map[ex]}")

    except Exception as e:
        print(f"  ⚠ Instrument map failed (non-fatal): {e}")
        # Continue without map – resolve_ticker will return input as-is


def ensure_initialized():
    """Try to initialize if not yet done. Returns (ok, error_msg)."""
    global _initialized, _init_error
    if _initialized:
        return True, None
    try:
        initialize()
        return True, None
    except Exception as e:
        return False, str(e)


def resolve_ticker(short_name: str) -> str:
    """Resolve short ticker to full Rofex ticker. Falls back to input."""
    if short_name in _instrument_map:
        return _instrument_map[short_name]
    ci_key = f"{short_name}-CI"
    if ci_key in _instrument_map:
        return _instrument_map[ci_key]
    up = short_name.upper()
    if up in _instrument_map:
        return _instrument_map[up]
    return short_name


# ── 5) MarketData entries ────────────────────────────────────
def _get_entries():
    """Build list of MarketDataEntry values to request."""
    entries = [
        pyRofex.MarketDataEntry.LAST,
        pyRofex.MarketDataEntry.BIDS,
        pyRofex.MarketDataEntry.OFFERS,
    ]
    optional = [
        "NOMINAL_VOLUME",
        "TRADE_EFFECTIVE_VOLUME",
        "TRADE_VOLUME",
        "TRADE_COUNT",
        "OPEN_INTEREST",
        "CLOSING_PRICE",
        "SETTLEMENT_PRICE",
    ]
    for attr in optional:
        if hasattr(pyRofex.MarketDataEntry, attr):
            entries.append(getattr(pyRofex.MarketDataEntry, attr))
    return entries


# ── Helpers ──────────────────────────────────────────────────
def _safe_num(val):
    """Extract number, return None if not valid or zero."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val if val != 0 else None
    return None


def _empty_quote(error=None):
    q = {
        "last": None,
        "bid": None,
        "offer": None,
        "bid_size": None,
        "offer_size": None,
        "close": None,
        "settle": None,
        "vol_vn": None,
        "effective_volume": None,
        "trade_volume": None,
        "trade_count": None,
        "open_interest": None,
        "vol_amount": None,  # explicitly null – not computed from feed
        "resolved_ticker": None,
    }
    if error:
        q["error"] = error
    return q


# ── 6) get_quotes: correct field mapping ────────────────────
def get_quotes(symbols: list[str]) -> dict:
    ok, err = ensure_initialized()
    if not ok:
        return {s: _empty_quote(error=err) for s in symbols}

    entries = _get_entries()
    results = {}

    for symbol in symbols:
        resolved = resolve_ticker(symbol)
        try:
            resp = pyRofex.get_market_data(ticker=resolved, entries=entries)

            status = resp.get("status")
            if status and status != "OK":
                desc = resp.get("description", resp.get("message", str(resp)))
                results[symbol] = _empty_quote(
                    error=f"API: {status} – {desc} (ticker: {resolved})"
                )
                continue

            md = resp.get("marketData")
            if md is None:
                results[symbol] = _empty_quote(error=f"No marketData (ticker: {resolved})")
                continue

            # ── Last price ────────────────────────────────
            la = md.get("LA", {})
            last_price = None
            if isinstance(la, dict):
                last_price = _safe_num(la.get("price"))

            # ── Closing price ─────────────────────────────
            cl = md.get("CL", {})
            close_price = None
            if isinstance(cl, dict):
                close_price = _safe_num(cl.get("price"))

            # ── Settlement price ──────────────────────────
            se = md.get("SE", {})
            settle_price = None
            if isinstance(se, dict):
                settle_price = _safe_num(se.get("price"))

            # ── Best bid ──────────────────────────────────
            bi = md.get("BI", [])
            bid_price = bid_size = None
            if isinstance(bi, list) and bi:
                bid_price = _safe_num(bi[0].get("price"))
                bid_size = _safe_num(bi[0].get("size"))
            elif isinstance(bi, dict):
                bid_price = _safe_num(bi.get("price"))
                bid_size = _safe_num(bi.get("size"))

            # ── Best offer ────────────────────────────────
            of = md.get("OF", [])
            offer_price = offer_size = None
            if isinstance(of, list) and of:
                offer_price = _safe_num(of[0].get("price"))
                offer_size = _safe_num(of[0].get("size"))
            elif isinstance(of, dict):
                offer_price = _safe_num(of.get("price"))
                offer_size = _safe_num(of.get("size"))

            # ── Volumes: map correctly per field ──────────
            vol_vn = _safe_num(md.get("NV"))               # NOMINAL_VOLUME
            effective_volume = _safe_num(md.get("EV"))      # TRADE_EFFECTIVE_VOLUME
            trade_volume = _safe_num(md.get("TV"))          # TRADE_VOLUME
            trade_count = _safe_num(md.get("TC"))           # TRADE_COUNT
            open_interest = _safe_num(md.get("OI"))         # OPEN_INTEREST

            # vol_amount (monto operado): NOT available from market data feed.
            # To compute it, use get_trade_history() and sum(price * qty).
            # For now, explicitly null.
            vol_amount = None

            # Display price: last > close > settle
            display_price = last_price or close_price or settle_price

            results[symbol] = {
                "last": display_price,
                "bid": bid_price,
                "offer": offer_price,
                "bid_size": bid_size,
                "offer_size": offer_size,
                "close": close_price,
                "settle": settle_price,
                "vol_vn": vol_vn,
                "effective_volume": effective_volume,
                "trade_volume": trade_volume,
                "trade_count": trade_count,
                "open_interest": open_interest,
                "vol_amount": vol_amount,
                "resolved_ticker": resolved,
            }
        except Exception as e:
            results[symbol] = _empty_quote(
                error=f"{type(e).__name__}: {e} (ticker: {resolved})"
            )

    return results


# ── 7) Debug: raw quote with env info ────────────────────────
def get_raw_quote(symbol: str) -> dict:
    """Return raw pyRofex response + env info for debugging."""
    ok, err = ensure_initialized()
    if not ok:
        return {"error": err}

    resolved = resolve_ticker(symbol)
    entries = _get_entries()

    try:
        resp = pyRofex.get_market_data(ticker=resolved, entries=entries)
        return {
            "requested": symbol,
            "resolved_to": resolved,
            "env": _env_label,
            "rest_url": _rest_url or "(pyRofex default)",
            "ws_url": _ws_url or "(pyRofex default)",
            "response": resp,
        }
    except Exception as e:
        return {
            "requested": symbol,
            "resolved_to": resolved,
            "env": _env_label,
            "rest_url": _rest_url or "(pyRofex default)",
            "ws_url": _ws_url or "(pyRofex default)",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


def get_instrument_list(filter_text: str = "") -> list:
    """Return discovered instruments, optionally filtered."""
    ok, _ = ensure_initialized()
    if not ok:
        return []

    results = []
    seen = set()
    for short, full in _instrument_map.items():
        if full in seen:
            continue
        if filter_text and filter_text.upper() not in full.upper():
            continue
        seen.add(full)
        results.append({"short": short, "full": full})

    return sorted(results, key=lambda x: x["short"])[:200]
