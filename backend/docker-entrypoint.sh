#!/usr/bin/env bash
# Apply migrations, seed the baseline, then serve with Gunicorn.
set -e

export FLASK_APP=wsgi.py

echo "→ Applying migrations…"
flask db upgrade

echo "→ Seeding baseline (idempotent)…"
flask seed

echo "→ Starting Gunicorn on :3001…"
exec gunicorn --bind 0.0.0.0:3001 --workers "${WEB_CONCURRENCY:-3}" wsgi:app
