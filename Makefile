# Marveen CMS — developer shortcuts.
.PHONY: help install test test-backend test-e2e build up down seed

help:
	@echo "install       install backend (dev) + frontend deps"
	@echo "test          run backend tests + frontend E2E"
	@echo "test-backend  run backend pytest with coverage"
	@echo "test-e2e      run Playwright E2E (needs the API running)"
	@echo "build         build the frontend"
	@echo "up / down     start / stop the full Docker stack"
	@echo "seed          seed permissions, roles and the super-admin"

install:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
	cd frontend && npm ci

test: test-backend test-e2e

test-backend:
	cd backend && . .venv/bin/activate && APP_ENV=testing python -m pytest --cov=app --cov-report=term-missing

test-e2e:
	cd frontend && npm run test:e2e

build:
	cd frontend && npm run build

up:
	docker compose up --build

down:
	docker compose down

seed:
	cd backend && . .venv/bin/activate && FLASK_APP=wsgi.py flask seed
