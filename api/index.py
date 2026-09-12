import sys
from pathlib import Path

# Add backend directory to sys.path so server.py and modules can be imported
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from server import app

# Export app for Vercel Serverless Function runner
__all__ = ["app"]
