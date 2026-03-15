"""
Pytest fixtures for SGA multi-agent orchestration tests.
"""

import os
import sys
import pytest
import tempfile
import shutil

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState, create_initial_state


@pytest.fixture
def sample_state() -> AgentState:
    """Create a sample initial state for testing."""
    return create_initial_state("Add a new feature to the game")


@pytest.fixture
def state_with_test_pass() -> AgentState:
    """Create a state where tests have passed."""
    state = create_initial_state("Fix a bug")
    state["status"] = "testing"
    state["content_iterations"] = 1
    state["test_iterations"] = 1
    state["test_result"] = {
        "passed": True,
        "error_count": 0,
        "warning_count": 0,
        "errors": [],
        "warnings": [],
    }
    state["files_modified"] = ["js/planet1.js"]
    state["content_result"] = "Added comment to planet1.js"
    return state


@pytest.fixture
def state_with_test_fail() -> AgentState:
    """Create a state where tests have failed."""
    state = create_initial_state("Add broken code")
    state["status"] = "testing"
    state["content_iterations"] = 1
    state["test_iterations"] = 1
    state["test_result"] = {
        "passed": False,
        "error_count": 2,
        "warning_count": 0,
        "errors": ["Syntax error in planet1.js", "Missing semicolon"],
        "warnings": [],
    }
    return state


@pytest.fixture
def state_at_max_iterations() -> AgentState:
    """Create a state at maximum content iterations."""
    state = create_initial_state("Complex task")
    state["status"] = "testing"
    state["content_iterations"] = 5  # MAX_CONTENT_ITERATIONS
    state["test_iterations"] = 5
    state["test_result"] = {
        "passed": False,
        "errors": ["Still failing"],
    }
    return state


@pytest.fixture
def temp_game_dir():
    """
    Create a temporary directory with mock game files for testing.

    Yields the path to the temp directory.
    """
    temp_dir = tempfile.mkdtemp()

    # Create js subdirectory
    js_dir = os.path.join(temp_dir, "js")
    os.makedirs(js_dir)

    # Create mock game files
    with open(os.path.join(js_dir, "globals.js"), "w") as f:
        f.write("const save = { hp: 100, lives: 3 };\n")

    with open(os.path.join(js_dir, "planet1.js"), "w") as f:
        f.write("function launchP1() {\n  console.log('Planet 1');\n}\n")

    with open(os.path.join(temp_dir, "index.html"), "w") as f:
        f.write("<html><body><canvas id='game'></canvas></body></html>\n")

    yield temp_dir

    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def temp_changelog():
    """
    Create a temporary CHANGELOG.md for testing.

    Yields the path to the temp file.
    """
    temp_dir = tempfile.mkdtemp()
    changelog_path = os.path.join(temp_dir, "CHANGELOG.md")

    with open(changelog_path, "w") as f:
        f.write("""# Changelog

## [Unreleased]

### Added
- Initial release

## [1.0.0] - 2024-01-01
- First version
""")

    yield changelog_path

    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_validation_pass():
    """Mock validation output for a passing test."""
    return """
📁 Files...
  ✓ js/globals.js
  ✓ js/planet1.js

🔤 Syntax...
  ✓ js/globals.js
  ✓ js/planet1.js

🔗 Combined...
  ✓ Clean

🆔 HTML IDs...
  ✓ All IDs exist

🚀 Runtime...
  ✓ All loaded
  ✓ launchP1() OK

────────────────────────────────────────
✅ All checks passed!
"""


@pytest.fixture
def mock_validation_fail():
    """Mock validation output for a failing test."""
    return """
📁 Files...
  ✓ js/globals.js
  ✗ MISSING: js/planet3.js

🔤 Syntax...
  ✓ js/globals.js
  ✗ js/planet1.js: Unexpected token

────────────────────────────────────────
❌ Fix errors before playing!
"""
