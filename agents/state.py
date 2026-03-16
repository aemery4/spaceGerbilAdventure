"""
Shared state definitions for the SGA multi-agent orchestration system.

This module defines the TypedDict state schema used by all agents in the
LangGraph StateGraph. The state flows through Orchestrator -> Content ->
Test/Documentation (parallel) with iteration tracking and escalation support.
"""

from typing import TypedDict, Literal, Optional
from typing_extensions import Annotated
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Shared state for the SGA multi-agent system.

    Attributes:
        messages: Conversation history with add_messages reducer for appending
        task: Current task description from human or orchestrator
        task_type: Classification of the task (feature, bugfix, refactor, docs)

        # Iteration tracking
        content_iterations: Number of Content agent attempts (max 5)
        test_iterations: Number of Test agent attempts (max 5)
        doc_iterations: Number of Documentation agent attempts (max 3)

        # Agent outputs
        interpretation_result: Structured task from Interpretation agent
        content_result: Latest output from Content agent
        test_result: Latest output from Test agent (pass/fail + details)
        doc_result: Latest output from Documentation agent
        deploy_result: Latest output from Deploy agent (commit/push status)

        # Clarification flow
        needs_clarification: Whether user input is needed
        clarification_question: Question to ask user
        clarification_options: Suggested options for user
        target_files: Files identified by interpretation agent

        # File tracking
        files_modified: List of files changed by Content agent
        test_files_checked: List of files validated by Test agent

        # Control flow
        current_agent: Which agent is currently active
        status: Overall workflow status
        needs_escalation: Whether human intervention is required
        escalation_reason: Why escalation was triggered
        escalation_options: The 3 resolution paths for human choice
    """

    # Message history
    messages: Annotated[list, add_messages]

    # Task information
    task: str
    task_type: Optional[Literal["feature", "bugfix", "refactor", "docs"]]

    # Iteration counters
    content_iterations: int
    test_iterations: int
    doc_iterations: int

    # Agent outputs
    interpretation_result: Optional[dict]
    content_result: Optional[str]
    test_result: Optional[dict]  # {"passed": bool, "errors": list, "warnings": list}
    doc_result: Optional[str]
    deploy_result: Optional[str]

    # Clarification flow
    needs_clarification: bool
    clarification_question: Optional[str]
    clarification_options: Optional[list[str]]
    target_files: list[str]

    # File tracking
    files_modified: list[str]
    test_files_checked: list[str]

    # Control flow
    current_agent: Literal["interpretation", "orchestrator", "content", "test", "documentation", "deploy", "human"]
    status: Literal["pending", "interpreting", "awaiting_clarification", "in_progress", "testing", "documenting", "deploying", "completed", "escalated"]
    needs_escalation: bool
    escalation_reason: Optional[str]
    escalation_options: Optional[list[str]]


# Constants for iteration limits
MAX_CONTENT_ITERATIONS = 5
MAX_TEST_ITERATIONS = 5
MAX_DOC_ITERATIONS = 3


def create_initial_state(task: str) -> AgentState:
    """
    Create a fresh initial state for a new task.

    Args:
        task: The task description from the human user

    Returns:
        AgentState with all fields initialized to defaults
    """
    return AgentState(
        messages=[],
        task=task,
        task_type=None,
        content_iterations=0,
        test_iterations=0,
        doc_iterations=0,
        interpretation_result=None,
        content_result=None,
        test_result=None,
        doc_result=None,
        deploy_result=None,
        needs_clarification=False,
        clarification_question=None,
        clarification_options=None,
        target_files=[],
        files_modified=[],
        test_files_checked=[],
        current_agent="orchestrator",
        status="pending",
        needs_escalation=False,
        escalation_reason=None,
        escalation_options=None,
    )
