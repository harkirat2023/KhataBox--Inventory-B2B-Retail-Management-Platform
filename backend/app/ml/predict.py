import warnings
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

warnings.filterwarnings("ignore", message="X has feature names")

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.pkl"

_loaded: dict[str, Any] | None = None


def _load_model():
    global _loaded
    if _loaded is not None:
        return _loaded
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run train.py first.")
    _loaded = joblib.load(MODEL_PATH)
    return _loaded


def predict_demand(
    product_data: dict,
) -> dict:
    """Predict demand for a product.

    Args:
        product_data: dict with keys — product_id, category, day_of_week, month,
                       is_holiday, selling_price, stock_quantity, day_of_month, is_weekend

    Returns:
        dict with predicted_demand, recommended_order_qty, confidence_score, seasonality_factor
    """
    model_bundle = _load_model()
    model = model_bundle["model"]
    cat_encoder = model_bundle["cat_encoder"]
    feature_cols = model_bundle["feature_cols"]

    cat_str = (product_data.get("category") or "unknown").lower()
    if cat_str not in cat_encoder.classes_:
        cat_str = "unknown"
    category_enc = cat_encoder.transform([cat_str])[0]
    row = {
        "product_id": product_data["product_id"],
        "day_of_week": product_data.get("day_of_week", 0),
        "month": product_data.get("month", 1),
        "is_holiday": product_data.get("is_holiday", 0),
        "selling_price": product_data.get("selling_price", 0),
        "stock_quantity": product_data.get("current_stock", 0),
        "day_of_month": product_data.get("day_of_month", 1),
        "is_weekend": product_data.get("is_weekend", 0),
        "category_enc": category_enc,
    }
    input_df = pd.DataFrame([{col: row.get(col, 0) for col in feature_cols}])

    pred = float(model.predict(input_df)[0])

    predictions = model.estimators_ if hasattr(model, "estimators_") else None
    if predictions is not None:
        individual_preds = [tree.predict(input_df)[0] for tree in predictions]
        std = float(pd.Series(individual_preds).std())
        confidence = max(0, min(100, round(100 - (std / max(pred, 1)) * 20)))
    else:
        confidence = 70

    trees_used = model.n_estimators if hasattr(model, "n_estimators") else 100
    confidence = min(confidence, 98)

    predicted_demand = max(0, round(pred))
    current_stock = product_data.get("current_stock", 0)
    recommended_order_qty = max(0, predicted_demand - current_stock)

    day = product_data.get("day_of_week", 0)
    month = product_data.get("month", 1)
    seasonality_factor = round(1.0 + (0.15 if month in [11, 12, 3, 4] else 0.0) + (0.1 if day >= 5 else 0.0), 2)

    return {
        "predicted_demand": predicted_demand,
        "recommended_order_qty": recommended_order_qty,
        "confidence_score": confidence,
        "seasonality_factor": seasonality_factor,
    }


def is_model_ready() -> bool:
    return MODEL_PATH.exists()
