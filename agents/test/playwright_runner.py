"""
Playwright Runner for Space Gerbil Adventure.

Runs Playwright browser automation tests and integrates results
with the Test Agent's validation pipeline.
"""

import os
import json
import subprocess
import glob
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field


# Paths
PLAYWRIGHT_DIR = Path(__file__).parent.parent.parent / "playwright"
GAME_DIR = Path(__file__).parent.parent.parent / "code" / "game_v3"
SCREENSHOTS_DIR = PLAYWRIGHT_DIR / "screenshots"
RESULTS_DIR = PLAYWRIGHT_DIR / "test-results"


@dataclass
class PlaywrightResult:
    """Result from Playwright test run."""
    passed: bool
    categories: dict = field(default_factory=dict)
    screenshots: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    raw_output: str = ""
    duration_ms: int = 0


def check_playwright_installed() -> bool:
    """Check if Playwright is installed."""
    package_json = PLAYWRIGHT_DIR / "package.json"
    node_modules = PLAYWRIGHT_DIR / "node_modules"
    return package_json.exists() and node_modules.exists()


def install_playwright() -> tuple[bool, str]:
    """
    Install Playwright and Chromium browser.

    Returns:
        Tuple of (success, output_message)
    """
    if not PLAYWRIGHT_DIR.exists():
        return False, f"Playwright directory not found: {PLAYWRIGHT_DIR}"

    try:
        # Run npm install
        result = subprocess.run(
            ["npm", "install"],
            cwd=str(PLAYWRIGHT_DIR),
            capture_output=True,
            text=True,
            timeout=120,
            shell=True,
        )

        if result.returncode != 0:
            return False, f"npm install failed: {result.stderr}"

        # Install Chromium
        result = subprocess.run(
            ["npx", "playwright", "install", "chromium"],
            cwd=str(PLAYWRIGHT_DIR),
            capture_output=True,
            text=True,
            timeout=300,
            shell=True,
        )

        if result.returncode != 0:
            return False, f"Chromium install failed: {result.stderr}"

        return True, "Playwright installed successfully"

    except subprocess.TimeoutExpired:
        return False, "Installation timed out"
    except Exception as e:
        return False, f"Installation error: {str(e)}"


def run_playwright_tests(headed: bool = False, timeout: int = 120) -> PlaywrightResult:
    """
    Run Playwright gameplay tests.

    Args:
        headed: If True, run with visible browser window
        timeout: Maximum seconds to wait for tests

    Returns:
        PlaywrightResult with test outcomes
    """
    result = PlaywrightResult(passed=False)

    # Check installation
    if not check_playwright_installed():
        result.errors.append("Playwright not installed. Run install_playwright() first.")
        return result

    # Ensure directories exist
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    RESULTS_DIR.mkdir(exist_ok=True)

    # Build command
    cmd = ["npx", "playwright", "test"]
    if headed:
        cmd.append("--headed")

    try:
        # Run tests
        proc = subprocess.run(
            cmd,
            cwd=str(PLAYWRIGHT_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=True,
            encoding='utf-8',
            errors='replace',
        )

        result.raw_output = (proc.stdout or "") + (proc.stderr or "")

        # Parse results
        result = _parse_playwright_output(result, proc.returncode)

        # Collect screenshots
        result.screenshots = _collect_screenshots()

        # Load bug report if exists
        bug_report_path = RESULTS_DIR / "bug-report.json"
        if bug_report_path.exists():
            with open(bug_report_path) as f:
                result.categories = json.load(f)

            # Update passed status based on categories
            result.passed = all(
                cat.get("passed", True)
                for cat in result.categories.values()
            )

        return result

    except subprocess.TimeoutExpired:
        result.errors.append(f"Tests timed out after {timeout}s")
        return result
    except Exception as e:
        result.errors.append(f"Test execution error: {str(e)}")
        return result


def _parse_playwright_output(result: PlaywrightResult, exit_code: int) -> PlaywrightResult:
    """Parse Playwright console output for errors and status."""
    output = result.raw_output

    # Check for passed/failed
    if exit_code == 0 and "passed" in output.lower():
        result.passed = True

    # Extract any logged issues
    for line in output.split("\n"):
        if "[BUG:" in line:
            result.errors.append(line.strip())
        elif "Error:" in line or "error:" in line:
            result.errors.append(line.strip())

    # Try to load JSON results
    json_results_path = RESULTS_DIR / "results.json"
    if json_results_path.exists():
        try:
            with open(json_results_path) as f:
                data = json.load(f)

            # Extract test stats
            if "stats" in data:
                stats = data["stats"]
                result.duration_ms = stats.get("duration", 0)

                if stats.get("unexpected", 0) > 0:
                    result.passed = False

        except json.JSONDecodeError:
            pass

    return result


def _collect_screenshots() -> list[dict]:
    """Collect screenshots taken during tests."""
    screenshots = []

    for png_file in SCREENSHOTS_DIR.glob("*.png"):
        screenshots.append({
            "name": png_file.stem,
            "path": str(png_file),
            "size_bytes": png_file.stat().st_size,
        })

    # Sort by name (should be numbered)
    screenshots.sort(key=lambda x: x["name"])

    return screenshots


def get_test_summary(result: PlaywrightResult) -> str:
    """Generate a human-readable summary of test results."""
    lines = [
        "=" * 50,
        "PLAYWRIGHT TEST RESULTS",
        "=" * 50,
        "",
        f"Overall: {'PASSED' if result.passed else 'FAILED'}",
        f"Duration: {result.duration_ms}ms",
        f"Screenshots: {len(result.screenshots)}",
        "",
    ]

    if result.categories:
        lines.append("Bug Categories:")
        for cat, data in result.categories.items():
            status = "✅" if data.get("passed", True) else "❌"
            lines.append(f"  {status} {cat}")
            for issue in data.get("issues", []):
                lines.append(f"      └─ {issue}")

    if result.errors:
        lines.append("")
        lines.append("Errors:")
        for err in result.errors:
            lines.append(f"  - {err}")

    lines.append("")
    lines.append("=" * 50)

    return "\n".join(lines)


def integrate_with_test_result(playwright_result: PlaywrightResult, test_result: dict) -> dict:
    """
    Merge Playwright results into Test Agent's test_result dict.

    Args:
        playwright_result: Results from Playwright run
        test_result: Existing test result from LLM analysis

    Returns:
        Updated test_result dict
    """
    # Add Playwright section
    test_result["playwright"] = {
        "passed": playwright_result.passed,
        "duration_ms": playwright_result.duration_ms,
        "screenshot_count": len(playwright_result.screenshots),
        "screenshots": playwright_result.screenshots[:5],  # Limit for report
    }

    # Merge category results
    if "categories" not in test_result:
        test_result["categories"] = {}

    for cat, data in playwright_result.categories.items():
        if cat in test_result["categories"]:
            # Combine with existing
            existing = test_result["categories"][cat]
            existing["playwright_passed"] = data.get("passed", True)
            existing["playwright_issues"] = data.get("issues", [])

            # If Playwright found issues, mark as failed
            if not data.get("passed", True):
                existing["passed"] = False
                existing["issues"] = existing.get("issues", []) + data.get("issues", [])
        else:
            # Add new category
            test_result["categories"][cat] = {
                "passed": data.get("passed", True),
                "issues": data.get("issues", []),
                "source": "playwright",
            }

    # Add Playwright errors to main errors list
    if playwright_result.errors:
        if "errors" not in test_result:
            test_result["errors"] = []
        test_result["errors"].extend(
            f"[Playwright] {err}" for err in playwright_result.errors
        )

    # Update overall passed status
    if not playwright_result.passed:
        test_result["passed"] = False

    return test_result


# CLI interface for standalone testing
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Playwright tests for SGA")
    parser.add_argument("--install", action="store_true", help="Install Playwright")
    parser.add_argument("--headed", action="store_true", help="Run with visible browser")
    parser.add_argument("--timeout", type=int, default=120, help="Test timeout in seconds")

    args = parser.parse_args()

    if args.install:
        print("Installing Playwright...")
        success, msg = install_playwright()
        print(msg)
        if not success:
            exit(1)

    print("Running Playwright tests...")
    result = run_playwright_tests(headed=args.headed, timeout=args.timeout)
    print(get_test_summary(result))

    exit(0 if result.passed else 1)
