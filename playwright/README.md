# Playwright Browser Tests for Space Gerbil Adventure

Automated browser testing using Playwright to validate gameplay.

## Installation

### Windows
```batch
cd playwright
install.bat
```

### Linux/Mac
```bash
cd playwright
chmod +x install.sh
./install.sh
```

### Manual
```bash
cd playwright
npm install
npx playwright install chromium
```

## Running Tests

### Headless (default)
```bash
npm test
```

### With visible browser
```bash
npm run test:headed
```

### Debug mode
```bash
npm run test:debug
```

## From Python

```python
from agents.test.playwright_runner import run_playwright_tests, get_test_summary

# Run tests
result = run_playwright_tests(headed=False)

# Print summary
print(get_test_summary(result))

# Check if passed
if result.passed:
    print("All tests passed!")
```

## Integration with Test Agent

```python
from agents.test import run_full_validation

# Run LLM analysis + Playwright tests
result = run_full_validation(include_playwright=True)
print(result)
```

## Bug Categories Tested

1. **spawn_state_initialization** - Enemies visible before trigger
2. **missing_visual_feedback** - Actions without visual response
3. **input_lock_state_corruption** - Movement permanently disabled
4. **data_content_placeholders** - Placeholder text in game
5. **missing_resource_placement** - Resources not spawned
6. **balance_tuning** - Player speed vs enemy speed
7. **invisible_damage_source** - Damage with no attacker
8. **interaction_fallthrough** - F key wrong message

## Output

- `screenshots/` - Screenshots at key test points
- `test-results/results.json` - Playwright test results
- `test-results/bug-report.json` - Bug category pass/fail
