"""
Tests for agents/orchestrator/agent.py - Orchestrator routing and logic.
"""

import pytest
from unittest.mock import patch, MagicMock

from agents.orchestrator.agent import (
    orchestrator_node,
    route_after_orchestrator,
    _extract_task_type,
    _handle_escalation,
)
from agents.state import create_initial_state, MAX_CONTENT_ITERATIONS


class TestExtractTaskType:
    """Test task type extraction from LLM response."""

    def test_extracts_feature(self):
        content = '{"task_type": "feature", "analysis": "New feature"}'
        assert _extract_task_type(content) == "feature"

    def test_extracts_bugfix(self):
        content = '{"task_type": "bugfix", "analysis": "Fix bug"}'
        assert _extract_task_type(content) == "bugfix"

    def test_extracts_refactor(self):
        content = '{"task_type": "refactor", "analysis": "Refactor code"}'
        assert _extract_task_type(content) == "refactor"

    def test_extracts_docs(self):
        content = '{"task_type": "docs", "analysis": "Documentation"}'
        assert _extract_task_type(content) == "docs"

    def test_defaults_to_feature(self):
        content = "Some random text without task type"
        assert _extract_task_type(content) == "feature"

    def test_case_insensitive_bugfix(self):
        content = "This is a BUGFIX for the player"
        assert _extract_task_type(content) == "bugfix"


class TestHandleEscalation:
    """Test escalation handling."""

    def test_sets_escalated_status(self, sample_state):
        result = _handle_escalation(sample_state, "Test reason")
        assert result["status"] == "escalated"

    def test_sets_needs_escalation(self, sample_state):
        result = _handle_escalation(sample_state, "Test reason")
        assert result["needs_escalation"] is True

    def test_sets_escalation_reason(self, sample_state):
        result = _handle_escalation(sample_state, "Max iterations reached")
        assert result["escalation_reason"] == "Max iterations reached"

    def test_provides_three_options(self, sample_state):
        result = _handle_escalation(sample_state, "Test reason")
        assert len(result["escalation_options"]) == 3

    def test_sets_human_agent(self, sample_state):
        result = _handle_escalation(sample_state, "Test reason")
        assert result["current_agent"] == "human"


class TestRouteAfterOrchestrator:
    """Test routing decisions."""

    def test_routes_to_human_on_escalation(self, sample_state):
        sample_state["needs_escalation"] = True
        assert route_after_orchestrator(sample_state) == "human"

    def test_routes_to_end_on_completed(self, sample_state):
        sample_state["status"] = "completed"
        sample_state["needs_escalation"] = False
        assert route_after_orchestrator(sample_state) == "__end__"

    def test_routes_to_content_on_in_progress(self, sample_state):
        sample_state["status"] = "in_progress"
        sample_state["needs_escalation"] = False
        assert route_after_orchestrator(sample_state) == "content"

    def test_routes_to_documentation_on_documenting(self, sample_state):
        sample_state["status"] = "documenting"
        sample_state["needs_escalation"] = False
        assert route_after_orchestrator(sample_state) == "documentation"

    def test_defaults_to_content(self, sample_state):
        sample_state["status"] = "unknown"
        sample_state["needs_escalation"] = False
        assert route_after_orchestrator(sample_state) == "content"


class TestOrchestratorNode:
    """Test orchestrator node logic."""

    def test_pending_routes_to_content(self, sample_state):
        """Test that pending tasks get analyzed and routed to content."""
        with patch("agents.orchestrator.agent.create_orchestrator_llm") as mock_llm:
            # Mock the LLM response
            mock_response = MagicMock()
            mock_response.content = '{"task_type": "feature"}'
            mock_llm.return_value.invoke.return_value = mock_response

            result = orchestrator_node(sample_state)

            assert result["status"] == "in_progress"
            assert result["current_agent"] == "content"
            assert result["task_type"] == "feature"

    def test_test_pass_routes_to_documentation(self, state_with_test_pass):
        """Test that passing tests route to documentation."""
        result = orchestrator_node(state_with_test_pass)

        assert result["status"] == "documenting"
        assert result["current_agent"] == "documentation"

    def test_test_fail_routes_to_content(self, state_with_test_fail):
        """Test that failing tests route back to content."""
        result = orchestrator_node(state_with_test_fail)

        assert result["status"] == "in_progress"
        assert result["current_agent"] == "content"

    def test_max_iterations_triggers_escalation(self, state_at_max_iterations):
        """Test that max iterations triggers escalation."""
        result = orchestrator_node(state_at_max_iterations)

        assert result["status"] == "escalated"
        assert result["needs_escalation"] is True
        assert "maximum iterations" in result["escalation_reason"]

    def test_completed_stays_completed(self, sample_state):
        """Test that completed status is preserved."""
        sample_state["status"] = "completed"
        result = orchestrator_node(sample_state)

        assert result["status"] == "completed"


class TestOrchestratorIntegration:
    """Integration tests for orchestrator behavior."""

    def test_full_escalation_flow(self):
        """Test complete escalation scenario."""
        state = create_initial_state("Complex task")
        state["status"] = "testing"
        state["content_iterations"] = MAX_CONTENT_ITERATIONS
        state["test_result"] = {"passed": False, "errors": ["Error"]}

        result = orchestrator_node(state)

        assert result["status"] == "escalated"
        assert result["needs_escalation"] is True
        assert result["current_agent"] == "human"
        assert len(result["escalation_options"]) == 3

    def test_successful_completion_flow(self, state_with_test_pass):
        """Test successful task completion."""
        result = orchestrator_node(state_with_test_pass)

        # Should route to documentation first
        assert result["status"] == "documenting"
        assert result["current_agent"] == "documentation"
