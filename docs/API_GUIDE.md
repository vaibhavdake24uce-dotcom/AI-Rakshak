# API guide

Base URL: `http://127.0.0.1:8000`

## Health
`GET /api/v1/health`

## Dashboard
`GET /api/v1/dashboard`
Returns aggregate counts from the current database.

## Incidents
`GET /api/v1/incidents`
Optional query parameters: `status=reported` and `district=Bhandara`.

`POST /api/v1/incidents`
```json
{
  "title": "Waterlogging near road",
  "description": "Unverified public report",
  "district": "Bhandara",
  "latitude": 21.1667,
  "longitude": 79.65,
  "severity": "medium"
}
```
New records are stored as `reported`, `verified=false`, `is_demo=false`.

`PATCH /api/v1/incidents/1`
```json
{"status":"reviewing"}
```
Valid statuses: `reported`, `reviewing`, `verified`, `resolved`. Setting status to `verified` sets the verified flag to true. This prototype has no authentication; run locally only.

## Shelters
`GET /api/v1/shelters`

## Data sources
`GET /api/v1/data-sources`

## Global disaster events
`GET /api/v1/global-events`

Returns current events from the GDACS RSS feed, including source alert levels, event type, location, and feed update time. The server caches successful responses for 15 minutes and serves the last successful result with a stale-data warning if GDACS is temporarily unavailable. This feed is not a comprehensive global risk assessment or an official emergency instruction system.

## Demo indicator
`GET /api/v1/risk-demo?rainfall_mm=35&river_level_m=2.4`

This is a toy arithmetic demonstration, not a trained model or an official warning.
