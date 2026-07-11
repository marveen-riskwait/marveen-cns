"""WSGI entry point.

Run the dev server with ``python wsgi.py`` (from ``backend/``), or serve with
``gunicorn wsgi:app``. The Flask CLI uses ``FLASK_APP=wsgi.py``.
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3001"))
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", False))
