import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.request import Request, urlopen

LOGGER = logging.getLogger(__name__)
FEED_URL = "https://www.gdacs.org/xml/rss.xml"
GDACS_NS = "http://www.gdacs.org"
GEO_NS = "http://www.w3.org/2003/01/geo/wgs84_pos#"
GEORSS_NS = "http://www.georss.org/georss"
CACHE_SECONDS = 900
MAX_FEED_BYTES = 2_000_000
MAX_EVENTS = 30

_cached_feed: dict | None = None
_cached_at: datetime | None = None


def _text(element: ET.Element, tag: str) -> str:
    return (element.findtext(tag) or "").strip()


def _number(value: str) -> float | None:
    try:
        return float(value)
    except ValueError:
        return None


def _timestamp(value: str) -> str | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, OverflowError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def parse_gdacs_feed(xml_data: bytes) -> dict:
    root = ET.fromstring(xml_data)
    channel = root.find("channel")
    if channel is None:
        raise ValueError("GDACS response has no RSS channel.")

    events = []
    counts = {"Red": 0, "Orange": 0, "Green": 0}
    for item in channel.findall("item"):
        is_current = _text(item, f"{{{GDACS_NS}}}iscurrent").lower() == "true"
        if not is_current:
            continue

        point = item.find(f"{{{GEO_NS}}}Point")
        latitude = _number(_text(point, f"{{{GEO_NS}}}lat")) if point is not None else None
        longitude = _number(_text(point, f"{{{GEO_NS}}}long")) if point is not None else None
        if latitude is None or longitude is None:
            georss_point = _text(item, f"{{{GEORSS_NS}}}point").split()
            if len(georss_point) == 2:
                latitude = latitude if latitude is not None else _number(georss_point[0])
                longitude = longitude if longitude is not None else _number(georss_point[1])

        alert_level = _text(item, f"{{{GDACS_NS}}}alertlevel").title()
        if alert_level in counts:
            counts[alert_level] += 1
        events.append({
            "id": _text(item, "guid") or _text(item, "link"),
            "title": _text(item, "title"),
            "description": _text(item, "description"),
            "link": _text(item, "link"),
            "published_at": _timestamp(_text(item, "pubDate")),
            "event_type": _text(item, f"{{{GDACS_NS}}}eventtype").upper() or "UNKNOWN",
            "alert_level": alert_level or "Unknown",
            "country": _text(item, f"{{{GDACS_NS}}}country") or "Location not specified",
            "latitude": latitude,
            "longitude": longitude,
            "is_current": is_current,
        })

    return {
        "source": "GDACS",
        "source_url": FEED_URL,
        "feed_updated_at": _timestamp(_text(channel, "pubDate")),
        "event_count": len(events),
        "alert_counts": counts,
        "events": events[:MAX_EVENTS],
    }


def get_gdacs_events() -> dict:
    global _cached_feed, _cached_at
    now = datetime.now(timezone.utc)
    if _cached_feed is not None and _cached_at is not None:
        age_seconds = (now - _cached_at).total_seconds()
        if age_seconds < CACHE_SECONDS:
            return {**_cached_feed, "stale": False, "cached": True}

    request = Request(FEED_URL, headers={"User-Agent": "AI-Rakshak-Prototype/0.1", "Accept": "application/rss+xml, application/xml"})
    try:
        with urlopen(request, timeout=10) as response:
            xml_data = response.read(MAX_FEED_BYTES + 1)
        if len(xml_data) > MAX_FEED_BYTES:
            raise ValueError("GDACS feed exceeded the maximum accepted size.")
        feed = parse_gdacs_feed(xml_data)
    except (OSError, TimeoutError, ET.ParseError, ValueError) as error:
        LOGGER.warning("Could not refresh the GDACS feed: %s", error)
        if _cached_feed is not None:
            return {
                **_cached_feed,
                "stale": True,
                "cached": True,
                "warning": "GDACS could not be reached; showing the last successful feed.",
            }
        raise RuntimeError("The GDACS global-event feed is temporarily unavailable.") from error

    _cached_feed = feed
    _cached_at = now
    return {**feed, "stale": False, "cached": False}
