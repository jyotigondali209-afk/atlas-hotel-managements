from pathlib import Path

from ml.train_model import train


def test_training_uses_chronological_holdout_and_writes_artifact(tmp_path: Path):
    source = Path(__file__).parents[1] / "ml" / "sample_daily_bookings.csv"
    target = tmp_path / "model.joblib"
    results = train(source, target)
    assert results["observations"] == 42
    assert results["train_rows"] > results["test_rows"]
    assert results["model_mae"] >= 0
    assert results["baseline_mae"] >= 0
    assert target.exists()