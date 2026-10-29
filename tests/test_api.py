from fastapi.testclient import TestClient
from backend.main import app
from backend.global_feed import parse_gdacs_feed

def test_health():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

def test_homepage_serves_relative_frontend_assets():
    with TestClient(app) as client:
        page = client.get("/")
        assert page.status_code == 200
        assert "./styles.css" in page.text
        assert "./theme.css" in page.text
        assert "./app.js" in page.text
        assert "./api/v1" in client.get("/static/app.js").text
        assert client.get("/styles.css").status_code == 200
        assert client.get("/theme.css").status_code == 200
        assert client.get("/app.js").status_code == 200

def test_gdacs_rss_parsing():
    xml_data = b"""<?xml version="1.0"?>
    <rss xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
      <channel><title>GDACS</title><pubDate>Thu, 29 Oct 2026 07:25:01 GMT</pubDate>
        <item><title>Flood event</title><description>Flooding reported.</description>
          <link>http://www.gdacs.org/report.aspx?eventtype=FL&amp;eventid=1</link>
          <guid>FL1</guid><pubDate>Thu, 29 Oct 2026 07:25:01 GMT</pubDate>
          <gdacs:iscurrent>true</gdacs:iscurrent><gdacs:eventtype>FL</gdacs:eventtype>
          <gdacs:alertlevel>Red</gdacs:alertlevel><gdacs:country>Example</gdacs:country>
          <geo:Point><geo:lat>10.5</geo:lat><geo:long>20.5</geo:long></geo:Point>
        </item>
      </channel>
    </rss>"""
    feed = parse_gdacs_feed(xml_data)
    assert feed["event_count"] == 1
    assert feed["alert_counts"]["Red"] == 1
    assert feed["events"][0]["event_type"] == "FL"
    assert feed["events"][0]["latitude"] == 10.5

def test_global_event_endpoint(monkeypatch):
    from backend import main
    monkeypatch.setattr(main, "get_gdacs_events", lambda: {
        "source": "GDACS", "event_count": 0, "alert_counts": {"Red": 0, "Orange": 0, "Green": 0}, "events": []
    })
    with TestClient(app) as client:
        response = client.get("/api/v1/global-events")
        assert response.status_code == 200
        assert response.json()["source"] == "GDACS"

def test_dashboard_and_seed_data():
    with TestClient(app) as client:
        dashboard = client.get("/api/v1/dashboard")
        assert dashboard.status_code == 200
        assert dashboard.json()["shelters_listed"] >= 1
        assert client.get("/api/v1/incidents").status_code == 200
        assert client.get("/api/v1/shelters").status_code == 200

def test_demo_risk_disclaimer():
    with TestClient(app) as client:
        response = client.get("/api/v1/risk-demo?rainfall_mm=30&river_level_m=2")
        assert response.status_code == 200
        assert response.json()["safe_for_emergency_decisions"] is False

def test_invalid_coordinates_rejected():
    with TestClient(app) as client:
        response = client.post("/api/v1/incidents", json={
            "title": "Test report", "district": "Bhandara",
            "latitude": 999, "longitude": 79.6, "severity": "medium"
        })
        assert response.status_code == 422
