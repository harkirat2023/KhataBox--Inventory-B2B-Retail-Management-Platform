import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path
import warnings

warnings.filterwarnings("ignore")

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.pkl"
RANDOM_SEED = 42
N_SAMPLES = 2000


def generate_synthetic_data(n_samples: int = N_SAMPLES) -> pd.DataFrame:
    np.random.seed(RANDOM_SEED)
    categories = ["electronics", "groceries", "clothing", "medicines", "stationery"]
    base_quantities = {"electronics": 15, "groceries": 80, "clothing": 30, "medicines": 40, "stationery": 50}

    product_ids = np.random.randint(1, 51, size=n_samples)
    dates = pd.date_range(start="2025-01-01", periods=365, freq="D")
    date_samples = np.random.choice(dates, size=n_samples)
    categories_arr = np.random.choice(categories, size=n_samples)

    df = pd.DataFrame({
        "product_id": product_ids,
        "date": date_samples,
        "category": categories_arr,
    })

    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_holiday"] = ((df["day_of_week"] >= 5) | ((df["month"] == 12) & (df["date"].dt.day >= 25))).astype(int)

    df["base_qty"] = df["category"].map(base_quantities)
    df["quantity"] = (
        df["base_qty"]
        + np.where(df["is_holiday"] == 1, 15, 0)
        + (5 - abs(df["day_of_week"] - 3)) * 2
        + np.random.normal(0, 8, size=n_samples)
    ).clip(0).astype(int)

    df.drop(columns=["base_qty"], inplace=True)
    return df


def train(save: bool = True) -> dict:
    df = generate_synthetic_data()

    cat_encoder = LabelEncoder()
    df["category_enc"] = cat_encoder.fit_transform(df["category"])

    feature_cols = ["product_id", "day_of_week", "month", "is_holiday", "category_enc"]
    X = df[feature_cols]
    y = df["quantity"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)

    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=RANDOM_SEED, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    if save:
        joblib.dump({"model": model, "cat_encoder": cat_encoder, "feature_cols": feature_cols}, MODEL_PATH)

    return {"r2_score": round(r2, 4), "mae": round(mae, 2), "samples": len(df)}


if __name__ == "__main__":
    metrics = train()
    print(f"Model trained — R²: {metrics['r2_score']}, MAE: {metrics['mae']}, Samples: {metrics['samples']}")
