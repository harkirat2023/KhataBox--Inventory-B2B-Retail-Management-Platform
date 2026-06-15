from pydantic import BaseModel


class PriceAnalysisItem(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    category: str
    supplier_id: int
    supplier_name: str
    last_supplier_price: float
    current_selling_price: float
    current_cost_price: float
    margin_percent: float
    profit_per_unit: float
    last_purchased: str | None

    model_config = {"from_attributes": True}


class SupplierPriceAnalysisResponse(BaseModel):
    supplier_id: int
    supplier_name: str
    items: list[PriceAnalysisItem]
    avg_margin_percent: float
    total_items: int
