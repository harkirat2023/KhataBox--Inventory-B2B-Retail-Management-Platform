from pydantic import BaseModel


class DailySalesPoint(BaseModel):
    date: str
    quantity: int
    revenue: float


class SalesHistoryResponse(BaseModel):
    product_id: int
    product_name: str
    daily_sales: list[DailySalesPoint]
    monthly_avg: float
    peak_month: str
    low_month: str
    trend: str
    mom_change_pct: float


class DemandForecastResponse(BaseModel):
    product_id: int
    product_name: str
    category: str | None
    current_stock: int
    total_sold_last_30_days: int
    total_sold_prev_30_days: int
    predicted_demand: int
    recommended_order_qty: int
    confidence_score: int
    seasonality_factor: float
    trend: str
    category_avg_monthly: float
    store_id: int | None


class RetrainResponse(BaseModel):
    r2_score: float
    mae: float
    samples: int
    features: list[str]
