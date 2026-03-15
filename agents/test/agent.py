"""
Test Agent for SGA Multi-Agent System.

The Test agent validates game code changes by:
1. Running the existing validate.js Node.js validator
2. Parsing validation results for errors/warnings
3. Providing structured feedback to the Orchestrator

The Test agent runs in parallel with the Documentation agent
after each Content agent completion.
"""

import subprocess
import os
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from ..state import AgentState, MAX_TEST_ITERATIONS


# Path to the game code directory (relative to project root)
GAME_CODE_PATH = "code/game_v3"


TEST_AGENT_SYSTEM_PROMPT = """You are the Test agent for Space Gerbil Adventure.

Your job is to analyze validation results and provide clear, actionable feedback.

When analyzing validation output:
1. Identify all errors (lines with ✗ or "fail" or "error")
2. Identify warnings (potential issues that aren't failures)
3. Categorize errors: syntax, missing files, ID mismatches, runtime failures
4. Provide specific fix suggestions when possible

Respond with a JSON object:
{
    "passed": true|false,
    "error_count": number,
    "warning_count": number,
    "errors": ["list of specific errors"],
    "warnings": ["list of warnings"],
    "suggestions": ["actionable fix suggestions"]
}
"""


def create_test_llm() -> ChatAnthropic:
    """Create the LLM instance for the Test agent."""
    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0,
        max_tokens=1024,
    )


def validation_node(state: AgentState) -> dict:
    """
    Test node function for the StateGraph.

    Runs validate.js and analyzes results. Updates test_result in state.

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    # Increment test iteration counter
    new_iterations = state["test_iterations"] + 1

    # Run the validator
    validation_output, exit_code = _run_validator()

    # If validator ran successfully, analyze results
    if validation_output is not None:
        test_result = _analyze_validation(validation_output, exit_code)
    else:
        test_result = {
            "passed": False,
            "error_count": 1,
            "warning_count": 0,
            "errors": ["Failed to run validate.js - Node.js may not be installed"],
            "warnings": [],
            "suggestions": ["Ensure Node.js is installed and accessible in PATH"],
        }

    # Determine files that were checked
    files_checked = _extract_checked_files(validation_output or "")

    return {
        "test_iterations": new_iterations,
        "test_result": test_result,
        "test_files_checked": files_checked,
        "status": "testing",
        "current_agent": "orchestrator",  # Return to orchestrator for evaluation
    }


def _run_validator() -> tuple[Optional[str], int]:
    """
    Run validate.js and capture output.

    Returns:
        Tuple of (output_string, exit_code) or (None, -1) on failure
    """
    try:
        # Get the game code directory
        game_path = os.path.join(os.getcwd(), GAME_CODE_PATH)

        result = subprocess.run(
            ["node", "validate.js"],
            cwd=game_path,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=30,  # 30 second timeout
        )

        # Combine stdout and stderr
        output = result.stdout + result.stderr
        return output, result.returncode

    except subprocess.TimeoutExpired:
        return "Validation timed out after 30 seconds", -1
    except FileNotFoundError:
        return None, -1
    except Exception as e:
        return f"Validation error: {str(e)}", -1


def _analyze_validation(output: str, exit_code: int) -> dict:
    """
    Analyze validation output and extract structured results.

    Args:
        output: Raw validator output
        exit_code: Process exit code (0 = success)

    Returns:
        Structured test result dict
    """
    errors = []
    warnings = []

    # Parse output lines for errors and warnings
    for line in output.split("\n"):
        line = line.strip()
        if "✗" in line or "MISSING" in line or "fail" in line.lower():
            # Clean up the error message
            error_msg = line.replace("✗", "").strip()
            if error_msg:
                errors.append(error_msg)
        elif "warn" in line.lower():
            warnings.append(line)

    # Check for overall pass/fail
    passed = exit_code == 0 and "All checks passed" in output

    # Generate suggestions based on common errors
    suggestions = _generate_suggestions(errors)

    return {
        "passed": passed,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "suggestions": suggestions,
        "raw_output": output,  # Include raw output for debugging
    }


def _generate_suggestions(errors: list[str]) -> list[str]:
    """Generate fix suggestions based on error patterns."""
    suggestions = []

    for error in errors:
        error_lower = error.lower()

        if "missing" in error_lower and ".js" in error_lower:
            suggestions.append(f"Create the missing JavaScript file")

        elif "syntax" in error_lower or "unexpected" in error_lower:
            suggestions.append("Check for syntax errors: missing brackets, semicolons, or quotes")

        elif "duplicate" in error_lower:
            suggestions.append("Remove duplicate variable declaration - check globals.js for existing definitions")

        elif "id" in error_lower and "missing" in error_lower:
            suggestions.append("Add missing HTML element ID to index.html")

        elif "launchp" in error_lower:
            suggestions.append("Check planet launch function for runtime errors")

    # Deduplicate
    return list(set(suggestions)) if suggestions else ["Review the errors and fix each one systematically"]


def _extract_checked_files(output: str) -> list[str]:
    """Extract list of files that were validated."""
    files = []
    for line in output.split("\n"):
        if "✓" in line or "✗" in line:
            # Extract filename from lines like "  ✓ js/globals.js"
            parts = line.split()
            for part in parts:
                if part.endswith(".js") or part.endswith(".html"):
                    files.append(part)
    return list(set(files))


def run_quick_validation() -> dict:
    """
    Standalone function to run validation without full state.

    Useful for testing the agent independently.

    Returns:
        Test result dict
    """
    output, exit_code = _run_validator()
    if output:
        return _analyze_validation(output, exit_code)
    return {"passed": False, "errors": ["Failed to run validator"]}
