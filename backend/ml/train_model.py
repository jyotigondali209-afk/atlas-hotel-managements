from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error


def make_features(dates: pd.Series) -> pd.DataFrame:
    parsed = pd.to_datetime(dates)
    day_of_year = parsed.dt.dayofyear
    return pd.DataFrame({
        "weekday": parsed.dt.weekday,
        "day": parsed.dt.day,
        "month": parsed.dt.month,
        "is_weekend": (parsed.dt.weekday >= 5).astype(int),
        "season_sin": np.sin(2 * np.pi * day_of_year / 365.25),
        "season_cos": np.cos(2 * np.pi * day_of_year / 365.25),
    })


def train(dataset: Path, model_path: Path) -> dict[str, float | int | bool]:
    frame = pd.read_csv(dataset)
    required = {"date", "bookings"}
    if not required.issubset(frame.columns):
        raise ValueError("Dataset must contain 'date' and 'bookings' columns")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["bookings"] = pd.to_numeric(frame["bookings"], errors="coerce")
    frame = frame.dropna(subset=["date", "bookings"]).sort_values("date").drop_duplicates("date")
    if len(frame) < 20:
        raise ValueError("At least 20 distinct daily observations are required for a chronological holdout")

    features = make_features(frame["date"])
    target = frame["bookings"].clip(lower=0)
    split = max(1, int(len(frame) * 0.8))
    train_x, test_x = features.iloc[:split], features.iloc[split:]
    train_y, test_y = target.iloc[:split], target.iloc[split:]
    if test_y.empty:
        raise ValueError("Not enough rows for a holdout set")

    model = RandomForestRegressor(n_estimators=250, min_samples_leaf=2, random_state=42)
    model.fit(train_x.to_numpy(), train_y)
    prediction = np.maximum(0, model.predict(test_x.to_numpy()))
    baseline = np.full(len(test_y), train_y.mean())
    model_mae = mean_absolute_error(test_y, prediction)
    baseline_mae = mean_absolute_error(test_y, baseline)
    model_rmse = root_mean_squared_error(test_y, prediction)
    baseline_rmse = root_mean_squared_error(test_y, baseline)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    return {
        "observations": int(len(frame)),
        "train_rows": int(len(train_y)),
        "test_rows": int(len(test_y)),
        "model_mae": round(float(model_mae), 3),
        "baseline_mae": round(float(baseline_mae), 3),
        "model_rmse": round(float(model_rmse), 3),
        "baseline_rmse": round(float(baseline_rmse), 3),
        "model_beats_baseline_mae": bool(model_mae < baseline_mae),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train an Atlas daily-booking Random Forest with chronological evaluation.")
    parser.add_argument("--data", type=Path, default=Path(__file__).with_name("sample_daily_bookings.csv"))
    parser.add_argument("--model", type=Path, default=Path(__file__).with_name("model.joblib"))
    args = parser.parse_args()
    results = train(args.data, args.model)
    print(f"Saved model: {args.model}")
    for key, value in results.items():
        print(f"{key}: {value}")
    print("Note: the bundled CSV is synthetic demo data, not hotel operating history.")


if __name__ == "__main__":
    main()