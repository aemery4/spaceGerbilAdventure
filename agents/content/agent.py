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
from ..knowledge.codebase_patterns import FULL_KNOWLEDGE


CONTENT_AGENT_SYSTEM_PROMPT = f"""You are the Content agent for Space Gerbil Adventure, a browser-based HTML5 canvas game.

Your job is to implement code changes requested by the Orchestrator. You have tools to read and write game files.

{FULL_KNOWLEDGE}

## MANDATORY WORKFLOW

Your FIRST or SECOND response MUST be a write_file tool call. No exceptions.

Step 1: Optionally read ONE file for context (if needed)
Step 2: Call write_file with the complete file content
Step 3: If more files needed (menu.js, index.html), call write_file again

## FAILURE CONDITIONS
- Responding with text explanations = FAILURE
- Describing code without write_file = FAILURE
- Reading more than 2 files before writing = FAILURE
- NOT calling write_file in your first 2 responses = FAILURE

You have all the templates and patterns you need above. USE THEM. WRITE THE FILE.

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
    # tool_choice="any" forces at least one tool per response (per LangChain docs)
    llm_with_tools = llm.bind_tools(CONTENT_TOOLS, tool_choice="any")

    # Build initial messages
    messages = [
        SystemMessage(content=CONTENT_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=f"""## TASK
Type: {task_type}
Description: {task}
{test_context}

INSTRUCTION: Use the write_file tool NOW to create/modify the required file(s). Do NOT respond with text - respond with a write_file tool call containing the complete file content.
"""),
    ]

    files_modified = []
    max_tool_rounds = 15  # Allow more rounds for complex tasks like creating new files

    try:
        import sys

        def log_tool(msg):
            print(f"[Content Agent] {msg}", file=sys.stderr)

        for round_num in range(max_tool_rounds):
            log_tool(f"Round {round_num + 1}/{max_tool_rounds}: Calling LLM...")

            # Get LLM response
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            # Check if there are tool calls
            if not response.tool_calls:
                # No tool calls - check if we've written any files yet
                if not files_modified and round_num < 5:
                    # No files written yet and we have rounds left - force retry
                    log_tool(f"WARNING: No tool calls and no write_file yet! Forcing retry...")
                    messages.append(HumanMessage(content="You must use the write_file tool. Respond ONLY with a write_file tool call containing the complete file. Do not explain - just call write_file NOW."))
                    continue

                log_tool(f"LLM finished with no more tool calls")
                if hasattr(response, "content") and response.content:
                    log_tool(f"Final response preview: {response.content[:200]}...")
                break

            # Check if any of the tool calls is write_file
            tool_names = [tc["name"] for tc in response.tool_calls]
            has_write = "write_file" in tool_names
            log_tool(f"LLM requested {len(response.tool_calls)} tool(s): {tool_names}")

            # Execute each tool call
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                log_tool(f"  -> Tool: {tool_name}, Args: {list(tool_args.keys())}")

                # Execute the tool
                if tool_name in TOOL_MAP:
                    tool_result = TOOL_MAP[tool_name].invoke(tool_args)

                    # Track file modifications
                    if tool_name == "write_file" and "file_path" in tool_args:
                        files_modified.append(tool_args["file_path"])
                        log_tool(f"  -> WROTE: {tool_args['file_path']}")
                    elif tool_name == "read_file":
                        log_tool(f"  -> Read: {tool_args.get('file_path', '?')}")
                else:
                    tool_result = f"Unknown tool: {tool_name}"
                    log_tool(f"  -> ERROR: Unknown tool {tool_name}")

                # Add tool result to messages
                messages.append(ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_call["id"],
                ))

            # After processing tool calls, if we've done 2+ rounds without writing, force it
            if round_num >= 2 and not files_modified and not has_write:
                log_tool(f"WARNING: {round_num + 1} rounds without write_file! Forcing on next round...")
                messages.append(HumanMessage(content="STOP READING. You have enough context. NOW call write_file with the complete file content. This is mandatory."))

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
