import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path
import warnings
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

warnings.filterwarnings("ignore")

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.pkl"
RANDOM_SEED = 42
N_SAMPLES = 2000

FEATURE_COLS = [
    "product_id", "day_of_week", "month", "is_holiday",
    "selling_price", "stock_quantity", "day_of_month", "is_weekend", "category_enc",
]


def generate_synthetic_data(n_samples: int = N_SAMPLES) -> pd.DataFrame:
    np.random.seed(RANDOM_SEED)
    categories = ["electronics", "groceries", "clothing", "medicines", "stationery", "unknown"]
    base_quantities = {"electronics": 15, "groceries": 80, "clothing": 30, "medicines": 40, "stationery": 50, "unknown": 30}
    price_ranges = {"electronics": (500, 50000), "groceries": (10, 500), "clothing": (200, 3000), "medicines": (50, 2000), "stationery": (5, 500), "unknown": (50, 1000)}

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
    df["day_of_month"] = df["date"].dt.day
    df["is_holiday"] = ((df["day_of_week"] >= 5) | ((df["month"] == 12) & (df["date"].dt.day >= 25))).astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["stock_quantity"] = np.random.randint(0, 200, size=n_samples)

    df["base_qty"] = df["category"].map(base_quantities)
    df["low_price"] = df["category"].map(lambda c: price_ranges[c][0])
    df["high_price"] = df["category"].map(lambda c: price_ranges[c][1])
    df["selling_price"] = np.random.uniform(df["low_price"], df["high_price"])
    df["quantity"] = (
        df["base_qty"]
        + np.where(df["is_holiday"] == 1, 15, 0)
        + (5 - abs(df["day_of_week"] - 3)) * 2
        + np.where(df["selling_price"] < df["low_price"] * 1.5, 10, 0)
        - np.where(df["stock_quantity"] < 20, 5, 0)
        + np.random.normal(0, 8, size=n_samples)
    ).clip(0).astype(int)

    df.drop(columns=["base_qty", "low_price", "high_price", "date"], inplace=True)
    return df


async def fetch_training_data(db: AsyncSession, shopkeeper_id: int | None = None) -> pd.DataFrame:
    from app.models.order import Order, OrderItem
    from app.models.product import Product

    conditions = [Order.status == "completed"]
    if shopkeeper_id is not None:
        conditions.append(Order.shopkeeper_id == shopkeeper_id)

    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)

    rows = await db.execute(
        select(
            OrderItem.product_id,
            Product.name,
            Product.category,
            Product.selling_price,
            Product.stock_quantity,
            Order.created_at,
            OrderItem.quantity,
        )
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .where(*conditions, Order.created_at >= six_months_ago)
    )
    records = rows.all()
    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records, columns=[
        "product_id", "name", "category", "selling_price",
        "stock_quantity", "created_at", "quantity",
    ])
    df["date"] = pd.to_datetime(df["created_at"])
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["day_of_month"] = df["date"].dt.day
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_holiday"] = (
        (df["day_of_week"] >= 5)
        | ((df["month"] == 12) & (df["date"].dt.day >= 25))
    ).astype(int)
    df.drop(columns=["name", "created_at", "date"], inplace=True)
    df.fillna({"category": "unknown", "selling_price": 0, "stock_quantity": 0}, inplace=True)
    return df


def _train_on_df(df: pd.DataFrame, save: bool = True) -> dict:
    cat_encoder = LabelEncoder()
    df["category_enc"] = cat_encoder.fit_transform(df["category"].astype(str))

    X = df[FEATURE_COLS]
    y = df["quantity"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)

    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=RANDOM_SEED, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    if save:
        joblib.dump({
            "model": model,
            "cat_encoder": cat_encoder,
            "feature_cols": FEATURE_COLS,
        }, MODEL_PATH)

    return {"r2_score": round(r2, 4), "mae": round(mae, 2), "samples": len(df)}


async def train_from_db(db: AsyncSession, shopkeeper_id: int | None = None) -> dict:
    df = await fetch_training_data(db, shopkeeper_id)
    if df.empty:
        fallback = generate_synthetic_data()
        return _train_on_df(fallback)
    return _train_on_df(df)


def train(save: bool = True) -> dict:
    df = generate_synthetic_data()
    return _train_on_df(df, save=save)


if __name__ == "__main__":
    metrics = train()
    print(f"Model trained — R²: {metrics['r2_score']}, MAE: {metrics['mae']}, Samples: {metrics['samples']}")
