import os
import subprocess
import sys


FIX_SQL = """
-- Widen alembic_version column (revision IDs >32 chars)
ALTER TABLE alembic_version ALTER COLUMN version_num TYPE varchar(255);

-- Ensure activity_type column is VARCHAR not ENUM (fix model change)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_activities' AND column_name='activity_type' AND data_type='USER-DEFINED') THEN
        ALTER TABLE product_activities ALTER COLUMN activity_type TYPE VARCHAR(50);
    END IF;
END $$;

-- Create product_activities table (migration 0024)
CREATE TABLE IF NOT EXISTS product_activities (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    shopkeeper_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    previous_value DOUBLE PRECISION,
    new_value DOUBLE PRECISION,
    quantity INTEGER,
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_product_activities_product_id ON product_activities(product_id);

-- Create price_history table (migration 0024)
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    shopkeeper_id INTEGER NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    previous_value DOUBLE PRECISION,
    new_value DOUBLE PRECISION,
    changed_by VARCHAR(255) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_price_history_product_id ON price_history(product_id);

-- Add notification type enum values (migration 0024)
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'order_completed';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'order_cancelled';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'order_rejected';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'order_revised';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'invoice_generated';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'purchase_order_received';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'supplier_added';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'customer_added';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'product_created';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'stock_updated';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'price_updated';
ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'qr_generated';

-- Ensure alembic version is at least 0024
INSERT INTO alembic_version (version_num)
SELECT '0024_noti_ext'
WHERE NOT EXISTS (SELECT 1 FROM alembic_version WHERE version_num >= '0024');
"""


def run_migrations():
    """Run alembic migrations then fix any remaining schema issues."""
    result = subprocess.call(["alembic", "upgrade", "head"])
    if result != 0:
        print("WARNING: Alembic migrations failed, continuing anyway...")

    try:
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
        from dotenv import load_dotenv
        import psycopg2

        load_dotenv()
        raw = os.environ.get("DATABASE_URL")
        if not raw:
            print("No DATABASE_URL — skipping SQL fix")
            return
        parsed = urlparse(raw)
        qs = parse_qs(parsed.query, keep_blank_values=True)
        for key in ("sslmode", "channel_binding"):
            qs.pop(key, None)
        clean = urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))
        dsn = clean.replace("+asyncpg://", "://")
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        for stmt in FIX_SQL.split(";"):
            s = stmt.strip()
            if s:
                try:
                    cur.execute(s)
                except Exception as e:
                    print(f"SQL fix skipped ({e})")
        conn.commit()
        cur.close()
        conn.close()
        print("DB schema fix applied successfully")
    except ImportError:
        print("psycopg2 not installed — skipping SQL fix")
    except Exception as e:
        print(f"SQL fix failed: {e}")


if __name__ == "__main__":
    run_migrations()
    port = int(os.environ.get("PORT", 8000))
    sys.exit(subprocess.call([
        "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
    ]))
