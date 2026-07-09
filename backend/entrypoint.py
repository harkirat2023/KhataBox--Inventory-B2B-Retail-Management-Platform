import os
import subprocess
import sys


def run_migrations():
    """Run alembic migrations before starting the app."""
    result = subprocess.call(["alembic", "upgrade", "head"])
    if result != 0:
        print("WARNING: Alembic migrations failed, continuing anyway...")


if __name__ == "__main__":
    run_migrations()
    port = int(os.environ.get("PORT", 8000))
    sys.exit(subprocess.call([
        "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
    ]))
