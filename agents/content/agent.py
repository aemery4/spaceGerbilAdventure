"""
Content Agent for SGA Multi-Agent System.

The Content agent is responsible for reading and modifying game code files.
It follows the codebase contract defined in CLAUDE.md and uses tools to
interact with the file system.

Key responsibilities:
1. Analyze tasks and determine which files need changes
2. Read existing code to understand context
3. Make targeted code modifications
4. Track all files modified for the Test agent
"""

import os
import json
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

from ..state import AgentState, MAX_CONTENT_ITERATIONS
from .tools import CONTENT_TOOLS, read_file, write_file, list_files, search_in_files


# Load the CLAUDE.md codebase contract
def _load_codebase_contract() -> str:
    """Load the CLAUDE.md file that defines codebase rules."""
    claude_md_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "code", "game_v3", "CLAUDE.md"
    )
    try:
        with open(claude_md_path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return "CLAUDE.md not found - proceed with caution"


CODEBASE_CONTRACT = _load_codebase_contract()


CONTENT_AGENT_SYSTEM_PROMPT = f"""You are the Content agent for Space Gerbil Adventure, a browser-based HTML5 canvas game.

Your job is to implement code changes requested by the Orchestrator. You have tools to read and write game files.

## CODEBASE CONTRACT (from CLAUDE.md)
{CODEBASE_CONTRACT}

## YOUR WORKFLOW

1. **Understand the task**: Read the task description carefully
2. **Explore first**: Use read_file to understand existing code
3. **Plan changes**: Identify exactly which file(s) need modification
4. **Make minimal changes**: Only modify what's necessary - avoid over-engineering
5. **Follow conventions**: Match existing code style, use const/let (never var)

## AVAILABLE TOOLS

- read_file(file_path): Read a game file (e.g., "js/planet1.js")
- write_file(file_path, content): Write complete file content
- list_files(): List all game files
- search_in_files(search_term, file_pattern): Search across files

## CRITICAL RULES

- ONLY edit the specific file that needs changing
- Read a file BEFORE modifying it
- When using write_file, include the COMPLETE file content
- Declare variables BEFORE the loop() function in planet files
- Canvas is always 800x520px

Remember: The Test agent will validate your changes with validate.js next.
"""


def create_content_llm() -> ChatAnthropic:
    """Create the LLM instance for the Content agent."""
    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0,
        max_tokens=8192,  # Higher limit for full file content
        max_retries=3,  # Retry on connection errors
        timeout=120.0,  # Longer timeout for large requests
    )


# Tool execution map
TOOL_MAP = {
    "read_file": read_file,
    "write_file": write_file,
    "list_files": list_files,
    "search_in_files": search_in_files,
}


def content_node(state: AgentState) -> dict:
    """
    Content node function for the StateGraph.

    Uses a simple tool-calling loop to read and modify game files.

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    # Increment content iteration counter
    new_iterations = state["content_iterations"] + 1

    # Check iteration limit
    if new_iterations > MAX_CONTENT_ITERATIONS:
        return {
            "content_iterations": new_iterations,
            "content_result": f"Max iterations ({MAX_CONTENT_ITERATIONS}) reached",
            "needs_escalation": True,
            "escalation_reason": f"Content agent exceeded {MAX_CONTENT_ITERATIONS} iterations",
        }

    # Build the task context
    task = state["task"]
    task_type = state.get("task_type", "feature")

    # Include previous test failures if this is a retry
    test_context = ""
    if state.get("test_result") and not state["test_result"].get("passed", True):
        errors = state["test_result"].get("errors", [])
        test_context = "\n\n## PREVIOUS TEST FAILURES (fix these!):\n"
        test_context += "\n".join(f"- {e}" for e in errors)

    # Create LLM with tools bound
    llm = create_content_llm()
    llm_with_tools = llm.bind_tools(CONTENT_TOOLS)

    # Build initial messages
    messages = [
        SystemMessage(content=CONTENT_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=f"""## TASK
Type: {task_type}
Description: {task}
{test_context}

Please complete this task. Start by reading the relevant file(s), then make the necessary changes.
"""),
    ]

    files_modified = []
    max_tool_rounds = 5  # Limit tool-calling rounds

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

                    # Track file modifications
                    if tool_name == "write_file" and "file_path" in tool_args:
                        files_modified.append(tool_args["file_path"])
                else:
                    tool_result = f"Unknown tool: {tool_name}"

                # Add tool result to messages
                messages.append(ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_call["id"],
                ))

        # Get final response content
        final_message = messages[-1]
        if hasattr(final_message, "content"):
            content_result = final_message.content
        else:
            content_result = "Task completed"

        return {
            "content_iterations": new_iterations,
            "content_result": content_result,
            "files_modified": list(set(files_modified)),
            "status": "testing",
            "messages": messages,
        }

    except Exception as e:
        return {
            "content_iterations": new_iterations,
            "content_result": f"Error during content generation: {str(e)}",
            "files_modified": files_modified,
            "status": "testing",
        }


# Standalone function for testing
def run_content_task(task: str, task_type: str = "feature") -> dict:
    """
    Run the content agent on a task without the full graph.

    Useful for testing the agent independently.

    Args:
        task: Task description
        task_type: Type of task (feature, bugfix, refactor, docs)

    Returns:
        Result dict with content_result and files_modified
    """
    from ..state import create_initial_state

    state = create_initial_state(task)
    state["task_type"] = task_type

    result = content_node(state)
    return {
        "content_result": result.get("content_result"),
        "files_modified": result.get("files_modified", []),
        "iterations": result.get("content_iterations", 1),
    }
