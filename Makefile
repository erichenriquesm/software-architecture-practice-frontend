# Web client of the trading platform. Everything runs in containers; the backend (backend/: make up) must be up
# for the app itself and for e2e, not for test-unit.
#
#   make up          build and start the dev server (Vite + HMR) on http://localhost:5173; API routes are proxied to the edge
#   make watch       same, in the foreground with Compose Watch (code changes without rebuild)
#   make down        stop the dev server
#   make logs        follow the dev server logs
#   make test-unit   typecheck (vue-tsc), lint, architecture rules and unit/component tests
#   make e2e         Playwright against the running platform, through the edge
#   make screens     screenshots of every screen (desktop and phone) into test-results/screens, for a visual check
#   make readme-media  screenshots, walkthrough video and GIF for the umbrella README, into media/
#   make build       production image (runs test-unit inside the build)
#   make deps        node_modules on your machine, for the editor

COMPOSE = docker compose -f docker/docker-compose.yml

.PHONY: up watch down logs test-unit e2e screens readme-media build deps

up:
	$(COMPOSE) up -d --build --wait frontend

watch:
	$(COMPOSE) up --build --watch frontend

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f frontend

test-unit:
	$(COMPOSE) run --rm --build tests

e2e:
	$(COMPOSE) run --rm e2e

screens:
	mkdir -p test-results/screens
	$(COMPOSE) run --rm e2e npx tsx e2e/screens/capture.ts test-results/screens

readme-media:
	rm -rf media && mkdir -p media
	$(COMPOSE) run --rm e2e npx tsx e2e/readme/capture.ts media
	docker run --rm -v "$(CURDIR)/media":/media mwader/static-ffmpeg:7.1 -y -i "$$(ls media/video/*.webm | head -1 | sed 's|media/|/media/|')" \
	  -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 /media/lastro-tour.gif

build:
	docker build -f docker/Dockerfile --target runtime -t trading-frontend .

deps:
	docker run --rm -v "$(CURDIR)":/app -w /app node:26-alpine npm ci --ignore-scripts --no-audit --no-fund
