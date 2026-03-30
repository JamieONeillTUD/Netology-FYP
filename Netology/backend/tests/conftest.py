# conftest.py
# Shared test setup for Flask route tests.
# The client fixture gives every test file a Flask test client
# without needing to repeat this setup in every file.

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c
