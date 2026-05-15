.PHONY: help setup test test-js test-php lint format build storybook clean

help:
	@echo "MetroViz-NC — common tasks"
	@echo "  make setup     Install JS + PHP dependencies"
	@echo "  make test      Run all tests"
	@echo "  make test-js   JS tests only"
	@echo "  make test-php  PHP tests only"
	@echo "  make lint      Run linters (dry-run)"
	@echo "  make format    Apply formatters"
	@echo "  make build     Production build (js/dist/)"
	@echo "  make storybook Storybook dev server (http://localhost:6006)"
	@echo "  make clean     Remove build artefacts (keeps node_modules)"

setup:
	npm install
	composer install

test: test-js test-php

test-js:
	npm run test

test-php:
	./vendor/bin/phpunit

lint:
	npm run lint
	npm run format:check
	./vendor/bin/php-cs-fixer fix --dry-run --diff

format:
	npm run format
	./vendor/bin/php-cs-fixer fix

build:
	npm run build

storybook:
	npm run storybook

clean:
	rm -rf js/dist storybook-static coverage
