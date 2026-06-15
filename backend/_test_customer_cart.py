"""Test customer product scanning functionality"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.customer import Customer
from app.models.customer_cart import CustomerCart, CustomerCartItem, CartStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.customer_cart import CustomerCartItemCreate


@pytest.fixture
def test_db():
    # Use in-memory database for testing
    test_engine = create_engine(
        "sqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Create tables
    from app.core.database import Base
    Base.metadata.create_all(bind=test_engine)

    yield TestingSessionLocal


@pytest.fixture
def test_app(test_db):
    from app.main import app

    def override_get_db():
        try:
            db = test_db()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    yield app


def test_add_item_to_cart_new_product(test_app):
    """Test adding a new product to cart"""
    client = TestClient(test_app)

    # Create test user and customer
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
        "full_name": "Test User"
    }
    client.post("/api/v1/auth/register/", json=user_data)

    # Login
    login_response = client.post("/api/v1/auth/login/", json={
        "username": "testuser",
        "password": "testpass123"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create test product
    product_data = {
        "name": "Test Product",
        "sku": "TEST-001",
        "category": "Test Category",
        "brand": "Test Brand",
        "description": "Test Product Description",
        "cost_price": 50.0,
        "selling_price": 100.0,
        "stock_quantity": 10,
        "reorder_threshold": 5,
        "batch_number": "BATCH-001",
        "owner_id": 1,
        "store_id": 1,
        "is_active": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    assert response.status_code == 201
    product = response.json()

    # Add product to cart
    cart_response = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 2},
        headers=headers
    )
    assert cart_response.status_code == 200
    cart_data = cart_response.json()
    assert cart_data["previous_item_exists"] == False
    assert cart_data["message"] == "Added to cart: Test Product"

    # Verify cart item
    cart_item = cart_data["item"]
    assert cart_item["product_id"] == product["id"]
    assert cart_item["quantity"] == 2
    assert cart_item["unit_price"] == 100.0

    # Verify cart total
    assert cart_data["cart"]["total"] == 240.0  # 2 * 100 * 1.18


def test_add_existing_item_to_cart(test_app):
    """Test adding quantity to existing cart item"""
    client = TestClient(test_app)

    # Setup user, customer, product (same as above)
    user_data = {
        "email": "test2@example.com",
        "username": "testuser2",
        "password": "testpass123",
        "full_name": "Test User 2"
    }
    client.post("/api/v1/auth/register/", json=user_data)

    login_response = client.post("/api/v1/auth/login/", json={
        "username": "testuser2",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create product
    product_data = {
        "name": "Existing Product",
        "sku": "EXISTING-001",
        "category": "Test Category",
        "brand": "Test Brand",
        "cost_price": 50.0,
        "selling_price": 150.0,
        "stock_quantity": 10,
        "reorder_threshold": 5,
        "batch_number": "BATCH-002",
        "owner_id": 1,
        "store_id": 1,
        "is_active": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product = response.json()

    # First addition
    cart_response1 = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 1},
        headers=headers
    )
    assert cart_response1.status_code == 200
    cart_data1 = cart_response1.json()
    assert cart_data1["previous_item_exists"] == False

    # Second addition (should increment quantity)
    cart_response2 = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 3},
        headers=headers
    )
    assert cart_response2.status_code == 200
    cart_data2 = cart_response2.json()
    assert cart_data2["previous_item_exists"] == True
    assert cart_data2["item"]["quantity"] == 4
    assert "Updated quantity" in cart_data2["message"]


def test_update_cart_item_quantity(test_app):
    """Test updating cart item quantity"""
    client = TestClient(test_app)

    # Setup (same as previous tests)
    user_data = {
        "email": "test3@example.com",
        "username": "testuser3",
        "password": "testpass123",
        "full_name": "Test User 3"
    }
    client.post("/api/v1/auth/register/", json=user_data)

    login_response = client.post("/api/v1/auth/login/", json={
        "username": "testuser3",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create product
    product_data = {
        "name": "Update Product",
        "sku": "UPDATE-001",
        "category": "Test Category",
        "brand": "Test Brand",
        "cost_price": 50.0,
        "selling_price": 75.0,
        "stock_quantity": 10,
        "reorder_threshold": 5,
        "batch_number": "BATCH-003",
        "owner_id": 1,
        "store_id": 1,
        "is_active": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product = response.json()

    # Add to cart
    cart_response = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 1},
        headers=headers
    )
    assert cart_response.status_code == 200

    # Update quantity
    update_response = client.put(
        f"/api/v1/customer-cart/items/{product['id']}/",
        json={"quantity": 5},
        headers=headers
    )
    assert update_response.status_code == 200
    update_data = update_response.json()
    assert update_data["quantity"] == 5


def test_remove_item_from_cart(test_app):
    """Test removing item from cart"""
    client = TestClient(test_app)

    # Setup (same as previous tests)
    user_data = {
        "email": "test4@example.com",
        "username": "testuser4",
        "password": "testpass123",
        "full_name": "Test User 4"
    }
    client.post("/api/v1/auth/register/", json=user_data)

    login_response = client.post("/api/v1/auth/login/", json={
        "username": "testuser4",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create product
    product_data = {
        "name": "Remove Product",
        "sku": "REMOVE-001",
        "category": "Test Category",
        "brand": "Test Brand",
        "cost_price": 50.0,
        "selling_price": 60.0,
        "stock_quantity": 10,
        "reorder_threshold": 5,
        "batch_number": "BATCH-004",
        "owner_id": 1,
        "store_id": 1,
        "is_active": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product = response.json()

    # Add to cart
    cart_response = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 2},
        headers=headers
    )
    assert cart_response.status_code == 200

    # Remove from cart
    delete_response = client.delete(
        f"/api/v1/customer-cart/items/{product['id']}/",
        headers=headers
    )
    assert delete_response.status_code == 204

    # Verify cart is empty
    get_response = client.get("/api/v1/customer-cart/", headers=headers)
    assert get_response.status_code == 200
    cart_data = get_response.json()
    assert len(cart_data) == 0


def test_checkout_cart(test_app):
    """Test checkout cart"""
    client = TestClient(test_app)

    # Setup
    user_data = {
        "email": "test5@example.com",
        "username": "testuser5",
        "password": "testpass123",
        "full_name": "Test User 5"
    }
    client.post("/api/v1/auth/register/", json=user_data)

    login_response = client.post("/api/v1/auth/login/", json={
        "username": "testuser5",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create product
    product_data = {
        "name": "Checkout Product",
        "sku": "CHECKOUT-001",
        "category": "Test Category",
        "brand": "Test Brand",
        "cost_price": 50.0,
        "selling_price": 80.0,
        "stock_quantity": 10,
        "reorder_threshold": 5,
        "batch_number": "BATCH-005",
        "owner_id": 1,
        "store_id": 1,
        "is_active": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product = response.json()

    # Add to cart
    cart_response = client.post(
        "/api/v1/customer-cart/items/",
        json={"product_id": product["id"], "quantity": 3},
        headers=headers
    )
    assert cart_response.status_code == 200

    # Checkout
    checkout_response = client.post(
        "/api/v1/customer-cart/checkout/",
        json={
            "payment_method": "credit",
            "notes": "Test checkout"
        },
        headers=headers
    )
    assert checkout_response.status_code == 200
    checkout_data = checkout_response.json()
    assert checkout_data["status"] == "completed"

    # Verify order was created
    orders_response = client.get("/api/v1/orders/my-orders/", headers=headers)
    assert orders_response.status_code == 200
    orders = orders_response.json()
    assert len(orders) == 1
    assert orders[0]["status"] == "pending"
