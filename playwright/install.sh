#!/bin/bash
echo "=== Installing Playwright for Space Gerbil Adventure ==="
echo

cd "$(dirname "$0")"

echo "[1/3] Installing npm dependencies..."
npm install || { echo "ERROR: npm install failed"; exit 1; }

echo
echo "[2/3] Installing Chromium browser..."
npx playwright install chromium || { echo "ERROR: Playwright browser install failed"; exit 1; }

echo
echo "[3/3] Creating test directories..."
mkdir -p tests test-results screenshots

echo
echo "=== Installation complete! ==="
echo
echo "Run tests with: npm test"
echo "Run headed (visible browser): npm run test:headed"
echo
