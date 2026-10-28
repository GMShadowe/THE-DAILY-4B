PYTHON ?= .venv/bin/python

.PHONY: setup run dry-run dev serve test lint

setup:
	python3 -m venv .venv
	$(PYTHON) -m pip install -r requirements-dev.txt
	cd web && npm install
	@test -f config.yaml || echo "next: run make dev and open the site to set up"

run:
	$(PYTHON) main.py --now

dry-run:
	$(PYTHON) main.py --dry-run

dev:
	cd web && npm run dev

serve:
	cd web && npm run build && npm run preview

test:
	$(PYTHON) -m pytest

lint:
	cd web && npm run lint
