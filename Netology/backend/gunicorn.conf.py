"""
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 16/04/2026

gunicorn.conf.py - Gunicorn Deployment Config
---
This file contains the Gunicorn settings used when the Netology
backend is deployed. It tells Gunicorn which port to bind to,
how many worker processes to run, and how long to wait before
timing out a request.

It is used for the live backend deployment rather than the
frontend pages themselves.
"""

import os

# Bind Gunicorn to the port provided by the hosting platform.
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Run two worker processes for the Flask app.
workers = 2

# Allow longer requests before Gunicorn stops waiting.
timeout = 120
