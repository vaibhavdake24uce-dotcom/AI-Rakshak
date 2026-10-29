"""Audit a CSV file's structure; does not infer flood labels or repair data."""
import argparse
import json
from pathlib import Path
import pandas as pd

TIME_HINTS = ("time", "date", "timestamp", "datetime", "observed_at")
LAT_HINTS = ("lat", "latitude")
LON_HINTS = ("lon", "lng", "longitude")
STATION_HINTS = ("station", "station_id", "station_name", "site_id")

def first_matching(columns, hints):
    lower = {str(c).lower(): c for c in columns}
    for hint in hints:
        for name, original in lower.items():
            if name == hint or hint in name:
                return original
    return None

def audit(path: Path):
    df = pd.read_csv(path, low_memory=False)
    time_col = first_matching(df.columns, TIME_HINTS)
    lat_col = first_matching(df.columns, LAT_HINTS)
    lon_col = first_matching(df.columns, LON_HINTS)
    station_col = first_matching(df.columns, STATION_HINTS)
    result = {
        "file": str(path),
        "rows": int(len(df)),
        "columns_count": int(len(df.columns)),
        "columns": [{"name": str(c), "dtype": str(df[c].dtype), "missing_count": int(df[c].isna().sum()), "missing_percent": round(float(df[c].isna().mean()*100), 2)} for c in df.columns],
        "duplicate_rows": int(df.duplicated().sum()),
        "time_column_detected": str(time_col) if time_col is not None else None,
        "timestamp_range": None,
        "invalid_timestamp_count": None,
        "latitude_column_detected": str(lat_col) if lat_col is not None else None,
        "longitude_column_detected": str(lon_col) if lon_col is not None else None,
        "invalid_coordinate_count": None,
        "station_column_detected": str(station_col) if station_col is not None else None,
        "unique_station_count": None,
        "warning": "Schema heuristics are suggestions only. Review field meanings and units manually; no flood labels are inferred."
    }
    if time_col is not None:
        parsed = pd.to_datetime(df[time_col], errors="coerce", utc=True)
        valid = parsed.dropna()
        result["invalid_timestamp_count"] = int(parsed.isna().sum())
        if not valid.empty:
            result["timestamp_range"] = {"min_utc": valid.min().isoformat(), "max_utc": valid.max().isoformat()}
    if lat_col is not None and lon_col is not None:
        lat = pd.to_numeric(df[lat_col], errors="coerce")
        lon = pd.to_numeric(df[lon_col], errors="coerce")
        invalid = lat.isna() | lon.isna() | ~lat.between(-90,90) | ~lon.between(-180,180)
        result["invalid_coordinate_count"] = int(invalid.sum())
    if station_col is not None:
        result["unique_station_count"] = int(df[station_col].nunique(dropna=True))
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path, help="Path to a CSV file to audit")
    parser.add_argument("--output", type=Path, help="Optional JSON output path")
    args = parser.parse_args()
    if not args.csv_file.exists():
        raise SystemExit(f"File not found: {args.csv_file}")
    report = audit(args.csv_file)
    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
        print(f"\nSaved audit report to: {args.output}")

if __name__ == "__main__":
    main()
