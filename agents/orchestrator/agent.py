"""
Orchestrator Agent for SGA Multi-Agent System.

The Orchestrator is the central coordinator that:
1. Receives tasks from human users
2. Classifies task type (feature, bugfix, refactor, docs)
3. Routes to Content agent for implementation
4. Monitors iteration counts and triggers escalation when limits exceeded
5. Coordinates parallel execution of Test and Documentation agents
"""

from typing import Literal
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from ..state import AgentState, MAX_CONTENT_ITERATIONS


# System prompt for the Orchestrator
ORCHESTRATOR_SYSTEM_PROMPT = """You are the Orchestrator agent for Space Gerbil Adventure, a browser-based game.

Your responsibilities:
1. Analyze incoming tasks and classify them as: feature, bugfix, refactor, or docs
2. Determine if the task is within scope for the Content agent
3. Monitor progress and iteration counts
4. Decide when to escalate to human intervention

When analyzing a task, respond with a JSON object:
{
    "task_type": "feature|bugfix|refactor|docs",
    "analysis": "Brief analysis of what needs to be done",
    "ready_for_content": true|false,
    "clarification_needed": "Any questions if ready_for_content is false"
}

Game context:
- HTML5 Canvas-based space exploration game
- Gerbil character navigates between planets
- JavaScript codebase in code/game_v3/
- Key files: globals.js, planet1-3.js, craft.js, hud.js, menu.js
"""


def create_orchestrator_llm() -> ChatAnthropic:
    """Create the LLM instance for the Orchestrator agent."""
    import os

    # Verify API key is available
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set. Please create a .env file with your API key.")

    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0,
        max_tokens=1024,
        timeout=60.0,  # 60 second timeout
        max_retries=2,
    )


def orchestrator_node(state: AgentState) -> dict:
    """
    Orchestrator node function for the StateGraph.

    Analyzes the current state and determines next steps:
    - On new task: Classify and route to Content agent
    - On test pass: Complete workflow
    - On test failure: Check iterations and either retry or escalate

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    # Determine what phase we're in
    if state["status"] == "pending":
        # New task - analyze and classify
        llm = create_orchestrator_llm()
        return _analyze_new_task(state, llm)

    elif state["status"] == "testing":
        # Test results came back - evaluate first
        test_result = state.get("test_result", {})

        if test_result.get("passed", False):
            # Tests passed - move to documentation
            return {
                "status": "documenting",
                "current_agent": "documentation",
            }
        else:
            # Tests failed - check if we can retry
            if state["content_iterations"] >= MAX_CONTENT_ITERATIONS:
                return _handle_escalation(
                    state,
                    reason=f"Content agent reached maximum iterations ({MAX_CONTENT_ITERATIONS}) with failing tests",
                )
            # Retry with content agent
            return {
                "status": "in_progress",
                "current_agent": "content",
            }

    elif state["status"] == "completed":
        # All done
        return {"current_agent": "orchestrator", "status": "completed"}

    # Default: continue with content agent
    return {
        "current_agent": "content",
        "status": "in_progress",
    }


def _analyze_new_task(state: AgentState, llm: ChatAnthropic) -> dict:
    """Analyze a new incoming task and classify it."""
    messages = [
        SystemMessage(content=ORCHESTRATOR_SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze this task:\n\n{state['task']}"),
    ]

    response = llm.invoke(messages)

    # Parse the response to extract task type
    # In production, use structured output or JSON parsing
    task_type = _extract_task_type(response.content)

    return {
        "task_type": task_type,
        "current_agent": "content",
        "status": "in_progress",
        "messages": [response],
    }


def _evaluate_test_results(state: AgentState, llm: ChatAnthropic) -> dict:
    """Evaluate test results and decide next steps."""
    test_result = state.get("test_result", {})

    if test_result.get("passed", False):
        # Tests passed - task completed (skip documentation for now)
        return {
            "status": "completed",
            "current_agent": "orchestrator",
        }
    else:
        # Tests failed - retry content agent
        return {
            "status": "in_progress",
            "current_agent": "content",
        }


def _handle_escalation(state: AgentState, reason: str) -> dict:
    """Handle escalation to human with 3 resolution options."""
    return {
        "status": "escalated",
        "current_agent": "human",
        "needs_escalation": True,
        "escalation_reason": reason,
        "escalation_options": [
            "Provide additional guidance and retry",
            "Simplify the task scope",
            "Abort and handle manually",
        ],
    }


def _extract_task_type(content: str) -> Literal["feature", "bugfix", "refactor", "docs"]:
    """Extract task type from LLM response. Simple heuristic extraction."""
    content_lower = content.lower()
    if "bugfix" in content_lower or '"task_type": "bugfix"' in content_lower:
        return "bugfix"
    elif "refactor" in content_lower or '"task_type": "refactor"' in content_lower:
        return "refactor"
    elif "docs" in content_lower or '"task_type": "docs"' in content_lower:
        return "docs"
    return "feature"


def route_after_orchestrator(state: AgentState) -> str:
    """
    Routing function to determine next node after Orchestrator.

    Used as a conditional edge in the StateGraph.

    Returns:
        Next node name: "content", "documentation", "human", or "__end__"
    """
    if state["needs_escalation"]:
        return "human"

    if state["status"] == "completed":
        return "__end__"

    if state["status"] == "in_progress":
        return "content"

    if state["status"] == "documenting":
        return "documentation"

    return "content"
