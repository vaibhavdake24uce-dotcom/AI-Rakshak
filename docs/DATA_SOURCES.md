# Data source register and feasibility checklist

The sources below are **candidates**, not a guarantee that every resource is downloadable, complete, open-licensed, or appropriate for a production system. Check terms on the actual resource before downloading or redistributing.

| Candidate | URL | Intended use | What must be verified |
|---|---|---|---|
| NWIC Maharashtra hourly rainfall telemetry | https://nwdp.nwic.gov.in/dataset/rainfall-telemetry-hourly-maharashtra-surface-water-department | Rainfall observations | Actual CSV/API access, columns, units, station IDs, timestamps, coverage, licence |
| NRSC/Bhuvan flood hazard layers | https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php | Historical flood extent context | Download/export availability, dates, geometry/raster format, spatial coverage, terms |
| CWC flood-affected area report | https://cwc.gov.in/sites/default/files/final-faa-website.pdf | Historical context and cross-checking | Whether the source has machine-readable georeferenced labels or only report maps |
| IMD API reference | https://api.imd.gov.in/public/api_reference.html | Forecast / rainfall API integration candidate | Authentication, allowed use, archive access, response schema, rate limits |
| OpenStreetMap | https://www.openstreetmap.org/ | Road/place basemap or road network | ODbL obligations, attribution, routing-data completeness and update frequency |
| NASA GPM IMERG | https://gpm.nasa.gov/data/imerg | Gridded precipitation candidate | Product choice, resolution, latency, download/authentication and terms |

## Provenance checklist for every downloaded file
- [ ] Stable source URL and source organisation
- [ ] Retrieval date and original filename
- [ ] Licence / terms and permission to use
- [ ] Geographic extent and date/time coverage
- [ ] File hash (SHA-256) to detect accidental changes
- [ ] Original untouched file under `data/raw/`
- [ ] Schema audit output under `data/manifests/`
- [ ] Processing script/version and output under `data/processed/`

## Modelling rule
Do not treat a date with no mapped flood pixels as a non-flood event unless the source explicitly supports that conclusion. Missing imagery, unobserved areas, and unknown labels must remain unknown. A flood-extent map by itself is not a future forecast label; inputs must be aligned to what was available before the target event.
