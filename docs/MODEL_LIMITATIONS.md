# Model limitations and responsible use

- This repository includes **no trained machine-learning model** and reports no model accuracy.
- `/api/v1/risk-demo` is a toy weighted arithmetic formula to demonstrate API-to-UI integration.
- Seeded incidents, shelter capacities and map coordinates are illustrative. They are not verified real-world reports.
- Do not use this project to direct evacuations, dispatch rescuers, certify a road as safe, or make life-safety decisions.
- Future ML work must begin with a documented dataset feasibility audit and legally permitted source files.
- Establish labels from verified sources; retain unknowns; prevent time/event leakage; test on unseen events.
- Evaluate precision, recall, F1, PR-AUC, calibration and false-negative cases. Publish only measured results with a clear test protocol.
- All operational decisions would require trained human responders, current authoritative data, independent validation and formal safety review.
