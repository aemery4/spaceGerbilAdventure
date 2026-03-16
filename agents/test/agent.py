"""
Test Agent for SGA Multi-Agent System.

The Test agent validates game code changes by:
1. Reading game files (read-only access)
2. Simulating gameplay mentally and checking against bug categories
3. Providing structured pass/fail feedback per category
"""

import os
import json
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage

from ..state import AgentState, MAX_TEST_ITERATIONS
from .tools import TEST_TOOLS, read_game_file, list_game_files, search_game_files, get_files_modified
from ..knowledge.codebase_patterns import FILE_STRUCTURE, GLOBAL_VARIABLES, TILE_TYPES


# Path to the game code directory (relative to project root)
GAME_CODE_PATH = "code/game_v3"


TEST_AGENT_SYSTEM_PROMPT = f"""You are the Test Agent for Space Gerbil Adventure. Your job is to validate Content Agent changes by simulating gameplay and checking against known bug categories. You have read-only access to all game files.

## PRE-LOADED CODEBASE KNOWLEDGE (no need to call list_game_files)
{FILE_STRUCTURE}

{GLOBAL_VARIABLES}

{TILE_TYPES}

## EFFICIENCY RULES
- You already know the file structure above - don't call list_game_files
- Only read the specific modified files using get_files_modified or read_game_file
- Focus on validating the changes, not exploring the codebase

Gameplay Simulation: Mentally trace through the modified code. Simulate player movement in all directions, enemy spawning and aggro, resource gathering (fuel, rock, plant, crystal), combat interactions, item crafting, NPC dialogue, and planet transitions. Think through what actually executes when a player performs these actions.

Bug Category Validation: For every Content Agent change, check all 8 categories:

1. Spawn State Initialization — enemies must not be visible or active until their trigger condition is met (proximity, dialogue, or explicit discovery event). Verify trigger logic exists.

2. Missing Visual Feedback — every action that has audio must also have a visible sprite change or animation. No silent-only or invisible-only events.

3. Input Lock / State Corruption — verify movement input is never permanently disabled. All code that sets gamePaused=true or disables input must have a corresponding cleanup path that re-enables it.

4. Data/Content Placeholders — scan all NPC names, item names, and string literals. Flag any value that looks like a variable name, default value, or placeholder (e.g. 'village', 'undefined', 'TODO', 'test').

5. Missing Resource Placement — verify every planet has fuel, rock, plant, and crystal resources initialized in its resource array. Count fuel pickups and verify against the level's fuel goal (P1=10, P2=15, P3=20).

6. Balance/Tuning — verify player base speed is >= the fastest enemy speed. Simulate a combat scenario; player should be able to disengage from any enemy.

7. Invisible Damage Source — verify all damage-dealing code is gated on a living, in-range attacker. No damage-over-time effects should run when no enemy is present. Check that dead enemies (hp<=0) cannot deal damage.

8. Interaction Fallthrough — trace the F key / click handler decision tree. Verify it routes correctly: (a) nothing in range → no message or generic 'nothing nearby'; (b) enemy in range → attack logic; (c) resource in range → gather logic; (d) spaceship in range → fuel check. The spaceship fuel message must ONLY fire when the spaceship is the closest valid target.

Additional UI Checks:

- Message/dialog boxes must render at the bottom of the screen, not center-screen
- Intro dialog boxes must set gamePaused=true and keep it true until the player clicks OK
- No dialog box should allow player movement while it is visible

Output: Return a structured report with pass/fail per category, specific line references for any failures, and a clear overall verdict of PASS or FAIL. On FAIL, include reproduction steps for the Content Agent to fix.

## AVAILABLE TOOLS

- read_game_file(file_path): Read a game file (e.g., "js/planet1.js")
- list_game_files(): List all game files
- search_game_files(search_term, file_pattern): Search across files
- get_files_modified(files_list): Read multiple files at once

## RESPONSE FORMAT

After analyzing all files, respond with a JSON report:
{{
    "passed": true|false,
    "categories": {{
        "spawn_state_initialization": {{"passed": true|false, "issues": [], "line_refs": []}},
        "missing_visual_feedback": {{"passed": true|false, "issues": [], "line_refs": []}},
        "input_lock_state_corruption": {{"passed": true|false, "issues": [], "line_refs": []}},
        "data_content_placeholders": {{"passed": true|false, "issues": [], "line_refs": []}},
        "missing_resource_placement": {{"passed": true|false, "issues": [], "line_refs": []}},
        "balance_tuning": {{"passed": true|false, "issues": [], "line_refs": []}},
        "invisible_damage_source": {{"passed": true|false, "issues": [], "line_refs": []}},
        "interaction_fallthrough": {{"passed": true|false, "issues": [], "line_refs": []}}
    }},
    "ui_checks": {{
        "dialog_position": {{"passed": true|false, "issues": []}},
        "intro_dialog_pause": {{"passed": true|false, "issues": []}},
        "dialog_blocks_movement": {{"passed": true|false, "issues": []}}
    }},
    "reproduction_steps": ["step 1", "step 2"],
    "summary": "Brief overall summary"
}}
"""


# Tool execution map
TOOL_MAP = {
    "read_game_file": read_game_file,
    "list_game_files": list_game_files,
    "search_game_files": search_game_files,
    "get_files_modified": get_files_modified,
}


def create_test_llm() -> ChatAnthropic:
    """Create the LLM instance for the Test agent."""
    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0,
        max_tokens=8192,
        max_retries=3,
        timeout=120.0,
    )


def validation_node(state: AgentState) -> dict:
    """
    Test node function for the StateGraph.

    Uses LLM-based gameplay simulation to validate Content Agent changes.

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    # Increment test iteration counter
    new_iterations = state["test_iterations"] + 1

    # Check iteration limit
    if new_iterations > MAX_TEST_ITERATIONS:
        return {
            "test_iterations": new_iterations,
            "test_result": {
                "passed": False,
                "error_count": 1,
                "errors": [f"Max test iterations ({MAX_TEST_ITERATIONS}) reached"],
                "suggestions": ["Manual review required"],
            },
            "status": "testing",
            "current_agent": "orchestrator",
        }

    # Build context from Content agent's work
    task = state["task"]
    files_modified = state.get("files_modified", [])
    content_result = state.get("content_result", "")

    # Create LLM with tools bound
    llm = create_test_llm()
    llm_with_tools = llm.bind_tools(TEST_TOOLS)

    # Build the validation request
    validation_request = f"""## VALIDATION REQUEST

**Original Task:** {task}
**Files Modified by Content Agent:** {', '.join(files_modified) if files_modified else 'Unknown'}

**Content Agent Summary:**
{content_result[:2000] if content_result else 'No summary available'}

## YOUR JOB

1. Read the modified files using the tools provided
2. Simulate gameplay mentally - trace through the code
3. Check all 8 bug categories and 3 UI checks
4. Return a structured JSON report with pass/fail per category

Start by reading the modified files, then analyze for bugs.
"""

    messages = [
        SystemMessage(content=TEST_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=validation_request),
    ]

    files_checked = []
    max_tool_rounds = 10  # Allow more rounds for thorough analysis

    try:
        for round_num in range(max_tool_rounds):
            # Get LLM response
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            # Check if there are tool calls
            if not response.tool_calls:
                # No more tool calls - agent is done
                break

            # Execute each tool call
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                # Execute the tool
                if tool_name in TOOL_MAP:
                    tool_result = TOOL_MAP[tool_name].invoke(tool_args)

                    # Track files that were read
                    if tool_name == "read_game_file" and "file_path" in tool_args:
                        files_checked.append(tool_args["file_path"])
                    elif tool_name == "get_files_modified" and "files_list" in tool_args:
                        files_checked.extend([f.strip() for f in tool_args["files_list"].split(",")])
                else:
                    tool_result = f"Unknown tool: {tool_name}"

                # Add tool result to messages
                messages.append(ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_call["id"],
                ))

        # Parse the final response
        final_message = messages[-1]
        test_result = _parse_test_result(getattr(final_message, "content", ""))

        return {
            "test_iterations": new_iterations,
            "test_result": test_result,
            "test_files_checked": list(set(files_checked)),
            "status": "testing",
            "current_agent": "orchestrator",
        }

    except Exception as e:
        return {
            "test_iterations": new_iterations,
            "test_result": {
                "passed": False,
                "error_count": 1,
                "errors": [f"Test agent error: {str(e)}"],
                "suggestions": ["Review manually or retry"],
            },
            "test_files_checked": files_checked,
            "status": "testing",
            "current_agent": "orchestrator",
        }


def _parse_test_result(response_content: str) -> dict:
    """
    Parse the LLM's test result response into structured format.

    Args:
        response_content: Raw LLM response

    Returns:
        Structured test result dict
    """
    # Try to extract JSON from response
    try:
        # Look for JSON block in response
        if "```json" in response_content:
            json_start = response_content.find("```json") + 7
            json_end = response_content.find("```", json_start)
            json_str = response_content[json_start:json_end].strip()
        elif "{" in response_content:
            # Find the outermost JSON object
            json_start = response_content.find("{")
            # Find matching closing brace
            brace_count = 0
            json_end = json_start
            for i, char in enumerate(response_content[json_start:], json_start):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break
            json_str = response_content[json_start:json_end]
        else:
            raise ValueError("No JSON found in response")

        result = json.loads(json_str)

        # Ensure required fields exist
        if "passed" not in result:
            result["passed"] = False

        # Convert to standard format for orchestrator
        errors = []
        suggestions = []

        if "categories" in result:
            for cat_name, cat_data in result["categories"].items():
                if isinstance(cat_data, dict) and not cat_data.get("passed", True):
                    for issue in cat_data.get("issues", []):
                        errors.append(f"[{cat_name}] {issue}")

        if "reproduction_steps" in result:
            suggestions = result["reproduction_steps"]

        result["error_count"] = len(errors)
        result["errors"] = errors
        result["suggestions"] = suggestions
        result["raw_response"] = response_content

        return result

    except (json.JSONDecodeError, ValueError) as e:
        # Fallback: try to determine pass/fail from text
        passed = "PASS" in response_content.upper() and "FAIL" not in response_content.upper()

        return {
            "passed": passed,
            "error_count": 0 if passed else 1,
            "errors": [] if passed else ["Could not parse structured response"],
            "suggestions": ["Review test agent output manually"],
            "raw_response": response_content,
        }


def _analyze_validation(output: str, exit_code: int) -> dict:
    """
    Legacy function for backward compatibility with existing tests.
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
            error_msg = line.replace("✗", "").strip()
            if error_msg:
                errors.append(error_msg)
        elif "warn" in line.lower():
            warnings.append(line)

    passed = exit_code == 0 and "All checks passed" in output
    suggestions = _generate_suggestions(errors)

    return {
        "passed": passed,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "suggestions": suggestions,
        "raw_output": output,
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

    return list(set(suggestions)) if suggestions else ["Review the errors and fix each one systematically"]


def _extract_checked_files(output: str) -> list[str]:
    """Extract list of files that were validated."""
    files = []
    for line in output.split("\n"):
        if "✓" in line or "✗" in line:
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
    from ..state import create_initial_state

    state = create_initial_state("Quick validation check")
    state["files_modified"] = ["js/globals.js", "js/planet1.js", "js/planet2.js"]
    state["content_result"] = "Validation check"

    result = validation_node(state)
    return result.get("test_result", {"passed": False, "errors": ["Validation failed"]})


def run_full_validation(include_playwright: bool = True, headed: bool = False) -> dict:
    """
    Run full validation including LLM analysis and optional Playwright tests.

    Args:
        include_playwright: Whether to run Playwright browser tests
        headed: If True, run Playwright with visible browser

    Returns:
        Combined test result dict
    """
    from ..state import create_initial_state

    # Run LLM-based validation
    state = create_initial_state("Full validation with browser tests")
    state["files_modified"] = ["js/globals.js", "js/planet1.js", "js/planet2.js"]
    state["content_result"] = "Full validation"

    result = validation_node(state)
    test_result = result.get("test_result", {"passed": False, "errors": ["LLM validation failed"]})

    # Optionally add Playwright tests
    if include_playwright:
        try:
            from .playwright_runner import (
                run_playwright_tests,
                integrate_with_test_result,
                check_playwright_installed,
                get_test_summary,
            )

            if check_playwright_installed():
                print("[Test Agent] Running Playwright browser tests...")
                pw_result = run_playwright_tests(headed=headed, timeout=120)
                print(get_test_summary(pw_result))

                # Merge results
                test_result = integrate_with_test_result(pw_result, test_result)
            else:
                test_result["playwright"] = {
                    "skipped": True,
                    "reason": "Playwright not installed. Run: cd playwright && npm install && npx playwright install chromium"
                }

        except ImportError as e:
            test_result["playwright"] = {
                "skipped": True,
                "reason": f"Playwright runner import failed: {e}"
            }
        except Exception as e:
            test_result["playwright"] = {
                "error": str(e)
            }

    return test_result
