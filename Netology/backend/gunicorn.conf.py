"""
gunicorn.conf.py – Gunicorn configuration for Render deployment.
Ensures the server binds to 0.0.0.0 on the PORT that Render injects.
"""

import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = 2
timeout = 120
