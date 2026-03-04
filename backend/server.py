"""Main entry point - imports from app package"""
from app.main import app

# Re-export for uvicorn
__all__ = ["app"]
