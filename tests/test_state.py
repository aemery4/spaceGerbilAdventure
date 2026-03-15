"""
Tests for agents/state.py - State creation and validation.
"""

import pytest
from agents.state import (
    AgentState,
    create_initial_state,
    MAX_CONTENT_ITERATIONS,
    MAX_TEST_ITERATIONS,
    MAX_DOC_ITERATIONS,
)


class TestConstants:
    """Test iteration limit constants."""

    def test_max_content_iterations(self):
        assert MAX_CONTENT_ITERATIONS == 5

    def test_max_test_iterations(self):
        assert MAX_TEST_ITERATIONS == 5

    def test_max_doc_iterations(self):
        assert MAX_DOC_ITERATIONS == 3


class TestCreateInitialState:
    """Test create_initial_state function."""

    def test_creates_state_with_task(self):
        state = create_initial_state("Test task")
        assert state["task"] == "Test task"

    def test_initializes_status_to_pending(self):
        state = create_initial_state("Test task")
        assert state["status"] == "pending"

    def test_initializes_current_agent_to_orchestrator(self):
        state = create_initial_state("Test task")
        assert state["current_agent"] == "orchestrator"

    def test_initializes_iteration_counters_to_zero(self):
        state = create_initial_state("Test task")
        assert state["content_iterations"] == 0
        assert state["test_iterations"] == 0
        assert state["doc_iterations"] == 0

    def test_initializes_results_to_none(self):
        state = create_initial_state("Test task")
        assert state["content_result"] is None
        assert state["test_result"] is None
        assert state["doc_result"] is None

    def test_initializes_file_lists_to_empty(self):
        state = create_initial_state("Test task")
        assert state["files_modified"] == []
        assert state["test_files_checked"] == []

    def test_initializes_escalation_to_false(self):
        state = create_initial_state("Test task")
        assert state["needs_escalation"] is False
        assert state["escalation_reason"] is None
        assert state["escalation_options"] is None

    def test_initializes_messages_to_empty(self):
        state = create_initial_state("Test task")
        assert state["messages"] == []

    def test_task_type_is_none_initially(self):
        state = create_initial_state("Test task")
        assert state["task_type"] is None

    def test_handles_empty_task(self):
        state = create_initial_state("")
        assert state["task"] == ""

    def test_handles_long_task(self):
        long_task = "A" * 10000
        state = create_initial_state(long_task)
        assert state["task"] == long_task

    def test_handles_special_characters_in_task(self):
        task = "Fix bug with 'quotes' and \"double quotes\" and <html>"
        state = create_initial_state(task)
        assert state["task"] == task


class TestAgentStateType:
    """Test AgentState TypedDict structure."""

    def test_state_has_required_keys(self, sample_state):
        required_keys = [
            "messages",
            "task",
            "task_type",
            "content_iterations",
            "test_iterations",
            "doc_iterations",
            "content_result",
            "test_result",
            "doc_result",
            "files_modified",
            "test_files_checked",
            "current_agent",
            "status",
            "needs_escalation",
            "escalation_reason",
            "escalation_options",
        ]
        for key in required_keys:
            assert key in sample_state, f"Missing key: {key}"

    def test_state_is_mutable(self, sample_state):
        sample_state["status"] = "in_progress"
        assert sample_state["status"] == "in_progress"

    def test_can_add_to_files_modified(self, sample_state):
        sample_state["files_modified"].append("js/test.js")
        assert "js/test.js" in sample_state["files_modified"]


class TestStateTransitions:
    """Test state values for different workflow stages."""

    def test_pending_state(self, sample_state):
        assert sample_state["status"] == "pending"
        assert sample_state["current_agent"] == "orchestrator"

    def test_in_progress_state(self, sample_state):
        sample_state["status"] = "in_progress"
        sample_state["current_agent"] = "content"
        assert sample_state["status"] == "in_progress"
        assert sample_state["current_agent"] == "content"

    def test_testing_state(self, state_with_test_pass):
        assert state_with_test_pass["status"] == "testing"
        assert state_with_test_pass["test_result"]["passed"] is True

    def test_escalated_state(self, sample_state):
        sample_state["status"] = "escalated"
        sample_state["needs_escalation"] = True
        sample_state["escalation_reason"] = "Max iterations reached"
        sample_state["escalation_options"] = ["Option 1", "Option 2", "Option 3"]

        assert sample_state["status"] == "escalated"
        assert sample_state["needs_escalation"] is True
        assert len(sample_state["escalation_options"]) == 3

    def test_completed_state(self, sample_state):
        sample_state["status"] = "completed"
        assert sample_state["status"] == "completed"
