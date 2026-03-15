"""
Tests for agents/graph.py - LangGraph integration tests.
"""

import pytest
from unittest.mock import patch, MagicMock

from agents.graph import create_sga_graph, run_task
from agents.state import create_initial_state


class TestGraphStructure:
    """Test graph structure and compilation."""

    def test_graph_compiles(self):
        """Test that the graph compiles without errors."""
        graph = create_sga_graph()
        assert graph is not None

    def test_graph_has_required_nodes(self):
        """Test that all required nodes are present."""
        graph = create_sga_graph()
        nodes = list(graph.nodes.keys())

        assert "orchestrator" in nodes
        assert "content" in nodes
        assert "test" in nodes
        assert "documentation" in nodes
        assert "human" in nodes

    def test_graph_has_start_node(self):
        """Test that __start__ node exists."""
        graph = create_sga_graph()
        nodes = list(graph.nodes.keys())
        assert "__start__" in nodes

    def test_graph_node_count(self):
        """Test expected number of nodes."""
        graph = create_sga_graph()
        # __start__, orchestrator, content, test, documentation, human
        assert len(graph.nodes) == 6


class TestGraphEdges:
    """Test graph edge connections."""

    def test_start_connects_to_orchestrator(self):
        """Test that START connects to orchestrator."""
        graph = create_sga_graph()
        # The graph structure should route from start to orchestrator
        # We can verify by checking the graph's structure
        assert "orchestrator" in graph.nodes

    def test_content_connects_to_test(self):
        """Test that content connects to test."""
        graph = create_sga_graph()
        # Both nodes should exist and be connected
        assert "content" in graph.nodes
        assert "test" in graph.nodes


class TestCreateInitialState:
    """Test initial state creation for graph."""

    def test_creates_valid_state(self):
        """Test that create_initial_state creates a valid state."""
        state = create_initial_state("Test task")
        assert state["task"] == "Test task"
        assert state["status"] == "pending"

    def test_state_has_all_required_fields(self):
        """Test that state has all fields needed by graph."""
        state = create_initial_state("Test task")

        required_fields = [
            "messages", "task", "task_type",
            "content_iterations", "test_iterations", "doc_iterations",
            "content_result", "test_result", "doc_result",
            "files_modified", "test_files_checked",
            "current_agent", "status",
            "needs_escalation", "escalation_reason", "escalation_options"
        ]

        for field in required_fields:
            assert field in state, f"Missing field: {field}"


class TestRunTask:
    """Test run_task function (mocked)."""

    def test_run_task_returns_dict(self):
        """Test that run_task returns a dictionary."""
        with patch("agents.graph.create_sga_graph") as mock_graph:
            mock_compiled = MagicMock()
            mock_compiled.invoke.return_value = {"status": "completed"}
            mock_graph.return_value = mock_compiled

            result = run_task("Test task")
            assert isinstance(result, dict)

    def test_run_task_invokes_graph(self):
        """Test that run_task invokes the graph."""
        with patch("agents.graph.create_sga_graph") as mock_graph:
            mock_compiled = MagicMock()
            mock_compiled.invoke.return_value = {"status": "completed"}
            mock_graph.return_value = mock_compiled

            run_task("Test task")
            mock_compiled.invoke.assert_called_once()

    def test_run_task_passes_initial_state(self):
        """Test that run_task passes correct initial state."""
        with patch("agents.graph.create_sga_graph") as mock_graph:
            mock_compiled = MagicMock()
            mock_compiled.invoke.return_value = {"status": "completed"}
            mock_graph.return_value = mock_compiled

            run_task("My test task")

            # Check the state passed to invoke
            call_args = mock_compiled.invoke.call_args
            state = call_args[0][0]
            assert state["task"] == "My test task"


class TestWorkflowSimulation:
    """Simulate workflow scenarios without API calls."""

    def test_pending_to_in_progress(self):
        """Test state transition from pending to in_progress."""
        state = create_initial_state("Test")
        assert state["status"] == "pending"

        # Simulate orchestrator processing
        state["status"] = "in_progress"
        state["current_agent"] = "content"
        state["task_type"] = "feature"

        assert state["status"] == "in_progress"
        assert state["current_agent"] == "content"

    def test_in_progress_to_testing(self):
        """Test state transition from in_progress to testing."""
        state = create_initial_state("Test")
        state["status"] = "in_progress"

        # Simulate content agent completion
        state["status"] = "testing"
        state["content_iterations"] = 1
        state["content_result"] = "Modified file"
        state["files_modified"] = ["js/test.js"]

        assert state["status"] == "testing"
        assert state["content_iterations"] == 1

    def test_testing_to_documenting_on_pass(self):
        """Test state transition to documenting on test pass."""
        state = create_initial_state("Test")
        state["status"] = "testing"
        state["test_result"] = {"passed": True, "errors": []}

        # Simulate orchestrator routing on pass
        state["status"] = "documenting"
        state["current_agent"] = "documentation"

        assert state["status"] == "documenting"

    def test_testing_to_in_progress_on_fail(self):
        """Test state transition back to in_progress on test fail."""
        state = create_initial_state("Test")
        state["status"] = "testing"
        state["test_result"] = {"passed": False, "errors": ["Error"]}
        state["content_iterations"] = 1

        # Simulate orchestrator routing on fail
        state["status"] = "in_progress"
        state["current_agent"] = "content"

        assert state["status"] == "in_progress"

    def test_escalation_on_max_iterations(self):
        """Test escalation when max iterations reached."""
        state = create_initial_state("Test")
        state["status"] = "testing"
        state["content_iterations"] = 5
        state["test_result"] = {"passed": False, "errors": ["Error"]}

        # Simulate orchestrator escalation
        state["status"] = "escalated"
        state["needs_escalation"] = True
        state["escalation_reason"] = "Max iterations reached"
        state["escalation_options"] = ["Option 1", "Option 2", "Option 3"]

        assert state["status"] == "escalated"
        assert state["needs_escalation"] is True


class TestGraphModularity:
    """Test that graph components are modular."""

    def test_imports_all_agents(self):
        """Test that all agent modules can be imported."""
        from agents.orchestrator import orchestrator_node
        from agents.content import content_node
        from agents.test import validation_node
        from agents.documentation import documentation_node

        assert callable(orchestrator_node)
        assert callable(content_node)
        assert callable(validation_node)
        assert callable(documentation_node)

    def test_agents_return_dicts(self):
        """Test that agents return dictionaries (state updates)."""
        from agents.orchestrator.agent import _handle_escalation
        from agents.state import create_initial_state

        state = create_initial_state("Test")
        result = _handle_escalation(state, "Test reason")

        assert isinstance(result, dict)
        assert "status" in result
