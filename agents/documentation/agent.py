"""
Documentation Agent for SGA Multi-Agent System.

The Documentation agent is responsible for maintaining CHANGELOG.md.
It runs after the Content agent completes changes and documents what was done.

Key responsibilities:
1. Read current CHANGELOG.md
2. Add new entries under [Unreleased] section
3. Categorize changes (Added, Changed, Fixed, Removed)
4. Track files modified and summarize changes
"""

import os
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage

from ..state import AgentState, MAX_DOC_ITERATIONS
from .tools import DOCUMENTATION_TOOLS, read_changelog, write_changelog, get_current_date


DOCUMENTATION_AGENT_SYSTEM_PROMPT = """You are the Documentation agent for Space Gerbil Adventure.

Your ONLY job is to maintain CHANGELOG.md. You document changes made by the Content agent.

## CHANGELOG FORMAT

Follow Keep a Changelog format (https://keepachangelog.com):

```markdown
# Changelog

## [Unreleased]

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features

## [1.0.0] - 2024-01-15
...
```

## YOUR WORKFLOW

1. Read the current CHANGELOG.md using the read_changelog tool
2. Analyze what the Content agent changed (files_modified and content_result)
3. Add a new entry under the appropriate category in [Unreleased]
4. Write the updated CHANGELOG.md using the write_changelog tool

## RULES

- ONLY modify CHANGELOG.md - nothing else
- Keep entries concise but descriptive
- Use present tense ("Add feature" not "Added feature")
- Include file names when relevant
- Don't duplicate existing entries
- Preserve all existing content - only add new entries

## CATEGORIES

- **Added**: New features or files
- **Changed**: Modifications to existing features
- **Fixed**: Bug fixes
- **Removed**: Removed features or deprecated code
"""


def create_documentation_llm() -> ChatAnthropic:
    """Create the LLM instance for the Documentation agent."""
    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0,
        max_tokens=2048,
        max_retries=3,
        timeout=60.0,
    )


# Tool execution map
TOOL_MAP = {
    "read_changelog": read_changelog,
    "write_changelog": write_changelog,
    "get_current_date": get_current_date,
}


def documentation_node(state: AgentState) -> dict:
    """
    Documentation node function for the StateGraph.

    Reads CHANGELOG.md, adds entry for Content agent's changes, writes back.

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    # Increment documentation iteration counter
    new_iterations = state["doc_iterations"] + 1

    # Check iteration limit
    if new_iterations > MAX_DOC_ITERATIONS:
        return {
            "doc_iterations": new_iterations,
            "doc_result": f"Max iterations ({MAX_DOC_ITERATIONS}) reached",
            "status": "completed",  # Still complete, just skip further doc attempts
        }

    # Build context from Content agent's work
    task = state["task"]
    task_type = state.get("task_type", "feature")
    files_modified = state.get("files_modified", [])
    content_result = state.get("content_result", "")

    # Create LLM with tools bound
    llm = create_documentation_llm()
    llm_with_tools = llm.bind_tools(DOCUMENTATION_TOOLS)

    # Build the task message
    task_message = f"""## TASK COMPLETED BY CONTENT AGENT

**Original Task:** {task}
**Task Type:** {task_type}
**Files Modified:** {', '.join(files_modified) if files_modified else 'None specified'}

**Content Agent Summary:**
{content_result[:1000] if content_result else 'No summary available'}

## YOUR JOB

1. Read the current CHANGELOG.md
2. Add an entry documenting this change under [Unreleased]
3. Write the updated CHANGELOG.md

Start by reading the changelog.
"""

    messages = [
        SystemMessage(content=DOCUMENTATION_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=task_message),
    ]

    max_tool_rounds = 3

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
            doc_result = final_message.content
        else:
            doc_result = "Documentation updated"

        return {
            "doc_iterations": new_iterations,
            "doc_result": doc_result,
            "status": "completed",
        }

    except Exception as e:
        return {
            "doc_iterations": new_iterations,
            "doc_result": f"Error during documentation: {str(e)}",
            "status": "completed",  # Still mark complete to not block workflow
        }


# Standalone function for testing
def run_documentation_task(
    task: str,
    files_modified: list[str],
    content_result: str,
    task_type: str = "feature"
) -> dict:
    """
    Run the documentation agent on a task without the full graph.

    Useful for testing the agent independently.

    Args:
        task: Original task description
        files_modified: List of files changed by Content agent
        content_result: Summary from Content agent
        task_type: Type of task

    Returns:
        Result dict with doc_result
    """
    from ..state import create_initial_state

    state = create_initial_state(task)
    state["task_type"] = task_type
    state["files_modified"] = files_modified
    state["content_result"] = content_result

    result = documentation_node(state)
    return {
        "doc_result": result.get("doc_result"),
        "iterations": result.get("doc_iterations", 1),
    }
