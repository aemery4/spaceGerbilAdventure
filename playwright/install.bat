@echo off
echo === Installing Playwright for Space Gerbil Adventure ===
echo.

cd /d "%~dp0"

echo [1/3] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    exit /b 1
)

echo.
echo [2/3] Installing Chromium browser...
call npx playwright install chromium
if errorlevel 1 (
    echo ERROR: Playwright browser install failed
    exit /b 1
)

echo.
echo [3/3] Creating test directories...
if not exist "tests" mkdir tests
if not exist "test-results" mkdir test-results
if not exist "screenshots" mkdir screenshots

echo.
echo === Installation complete! ===
echo.
echo Run tests with: npm test
echo Run headed (visible browser): npm run test:headed
echo.
