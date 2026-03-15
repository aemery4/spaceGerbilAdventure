"""
Tests for agents/documentation/agent.py - Documentation agent with mocked LLM calls.

These tests mock ChatAnthropic to test the agent logic without real API calls.
"""

import pytest
from unittest.mock import patch, MagicMock

from agents.documentation.agent import (
    documentation_node,
    create_documentation_llm,
    run_documentation_task,
    DOCUMENTATION_AGENT_SYSTEM_PROMPT,
    TOOL_MAP,
)
from agents.state import create_initial_state, MAX_DOC_ITERATIONS


class TestCreateDocumentationLLM:
    """Test LLM creation for documentation agent."""

    def test_creates_llm_instance(self):
        """Test that create_documentation_llm creates a ChatAnthropic instance."""
        with patch("agents.documentation.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            llm = create_documentation_llm()
            mock_chat.assert_called_once()

    def test_llm_has_correct_model(self):
        """Test that LLM is created with correct model."""
        with patch("agents.documentation.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            create_documentation_llm()
            call_kwargs = mock_chat.call_args[1]
            assert call_kwargs["model"] == "claude-sonnet-4-20250514"

    def test_llm_has_correct_settings(self):
        """Test LLM settings for documentation."""
        with patch("agents.documentation.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            create_documentation_llm()
            call_kwargs = mock_chat.call_args[1]
            assert call_kwargs["temperature"] == 0
            assert call_kwargs["max_tokens"] == 2048
            assert call_kwargs["max_retries"] == 3
            assert call_kwargs["timeout"] == 60.0


class TestDocumentationSystemPrompt:
    """Test system prompt configuration."""

    def test_prompt_includes_changelog_format(self):
        """Test that prompt includes changelog format."""
        assert "## [Unreleased]" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "### Added" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "### Changed" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "### Fixed" in DOCUMENTATION_AGENT_SYSTEM_PROMPT

    def test_prompt_includes_workflow(self):
        """Test that prompt includes workflow instructions."""
        assert "WORKFLOW" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "read_changelog" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "write_changelog" in DOCUMENTATION_AGENT_SYSTEM_PROMPT

    def test_prompt_includes_rules(self):
        """Test that prompt includes rules."""
        assert "RULES" in DOCUMENTATION_AGENT_SYSTEM_PROMPT
        assert "CHANGELOG.md" in DOCUMENTATION_AGENT_SYSTEM_PROMPT


class TestToolMap:
    """Test tool mapping configuration."""

    def test_all_tools_mapped(self):
        """Test that all documentation tools are in TOOL_MAP."""
        assert "read_changelog" in TOOL_MAP
        assert "write_changelog" in TOOL_MAP
        assert "get_current_date" in TOOL_MAP

    def test_tools_are_callable(self):
        """Test that mapped tools have invoke method."""
        for tool_name, tool in TOOL_MAP.items():
            assert hasattr(tool, "invoke"), f"{tool_name} missing invoke method"


class TestDocumentationNodeIterations:
    """Test documentation_node iteration handling."""

    def test_increments_iteration_count(self):
        """Test that iteration counter is incremented."""
        state = create_initial_state("Test task")
        state["doc_iterations"] = 1

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"
            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert result["doc_iterations"] == 2

    def test_max_iterations_completes_gracefully(self):
        """Test that exceeding max iterations completes without escalation."""
        state = create_initial_state("Test task")
        state["doc_iterations"] = MAX_DOC_ITERATIONS  # At max

        result = documentation_node(state)

        # Documentation doesn't escalate, it just completes
        assert result["status"] == "completed"
        assert "Max iterations" in result["doc_result"]
        assert result["doc_iterations"] == MAX_DOC_ITERATIONS + 1


class TestDocumentationNodeToolCalls:
    """Test documentation_node tool calling logic."""

    def test_executes_read_changelog_tool(self):
        """Test that read_changelog tool calls are executed."""
        state = create_initial_state("Update docs")
        state["files_modified"] = ["js/test.js"]
        state["content_result"] = "Added feature"

        mock_read_tool = MagicMock()
        mock_read_tool.invoke.return_value = "# Changelog\n..."

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm, \
             patch.dict("agents.documentation.agent.TOOL_MAP", {"read_changelog": mock_read_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "read_changelog",
                "args": {},
                "id": "call_read"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Changelog read"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = documentation_node(state)
            mock_read_tool.invoke.assert_called_once()

    def test_executes_write_changelog_tool(self):
        """Test that write_changelog tool calls are executed."""
        state = create_initial_state("Update docs")
        state["files_modified"] = ["js/feature.js"]
        state["content_result"] = "Added new feature"

        mock_write_tool = MagicMock()
        mock_write_tool.invoke.return_value = "Success"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm, \
             patch.dict("agents.documentation.agent.TOOL_MAP", {"write_changelog": mock_write_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "write_changelog",
                "args": {"content": "# Changelog\n## [Unreleased]\n### Added\n- New feature"},
                "id": "call_write"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Changelog updated"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = documentation_node(state)
            mock_write_tool.invoke.assert_called_once()

    def test_executes_get_current_date_tool(self):
        """Test that get_current_date tool calls are executed."""
        state = create_initial_state("Add dated entry")
        state["files_modified"] = ["js/test.js"]

        mock_date_tool = MagicMock()
        mock_date_tool.invoke.return_value = "2024-03-15"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm, \
             patch.dict("agents.documentation.agent.TOOL_MAP", {"get_current_date": mock_date_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "get_current_date",
                "args": {},
                "id": "call_date"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = documentation_node(state)
            mock_date_tool.invoke.assert_called_once()

    def test_handles_unknown_tool(self):
        """Test handling of unknown tool names."""
        state = create_initial_state("Test unknown")
        state["files_modified"] = []

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "unknown_doc_tool",
                "args": {},
                "id": "call_unknown"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            # Should not raise an error
            result = documentation_node(state)
            assert result["status"] == "completed"

    def test_respects_max_tool_rounds(self):
        """Test that tool rounds are limited to 3."""
        state = create_initial_state("Endless docs")
        state["files_modified"] = ["test.js"]

        mock_read_tool = MagicMock()
        mock_read_tool.invoke.return_value = "content"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm, \
             patch.dict("agents.documentation.agent.TOOL_MAP", {"read_changelog": mock_read_tool}):
            # Always returns tool calls
            mock_response = MagicMock()
            mock_response.tool_calls = [{
                "name": "read_changelog",
                "args": {},
                "id": "call_loop"
            }]
            mock_response.content = "Still working"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            # Should complete after max rounds (3 for docs)
            assert mock_llm.return_value.bind_tools.return_value.invoke.call_count == 3


class TestDocumentationNodeContext:
    """Test documentation_node context building."""

    def test_includes_task_in_context(self):
        """Test that original task is included."""
        state = create_initial_state("Add player health feature")
        state["files_modified"] = ["js/player.js"]
        state["content_result"] = "Added health tracking"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            documentation_node(state)

            call_args = mock_llm.return_value.bind_tools.return_value.invoke.call_args
            messages = call_args[0][0]
            # Find human message with task
            found_task = any("Add player health feature" in str(getattr(m, "content", "")) for m in messages)
            assert found_task

    def test_includes_files_modified(self):
        """Test that files_modified are included."""
        state = create_initial_state("Test")
        state["files_modified"] = ["js/player.js", "js/enemy.js"]
        state["content_result"] = "Modified files"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            documentation_node(state)

            call_args = mock_llm.return_value.bind_tools.return_value.invoke.call_args
            messages = call_args[0][0]
            human_content = str([getattr(m, "content", "") for m in messages])
            assert "js/player.js" in human_content or "player.js" in human_content

    def test_includes_content_result(self):
        """Test that content_result is included."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]
        state["content_result"] = "Added new powerup system with 5 types"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            documentation_node(state)

            call_args = mock_llm.return_value.bind_tools.return_value.invoke.call_args
            messages = call_args[0][0]
            human_content = str([getattr(m, "content", "") for m in messages])
            assert "powerup" in human_content

    def test_handles_empty_files_modified(self):
        """Test handling when no files were modified."""
        state = create_initial_state("Test")
        state["files_modified"] = []
        state["content_result"] = "No changes"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert result["status"] == "completed"

    def test_truncates_long_content_result(self):
        """Test that very long content_result is truncated."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]
        state["content_result"] = "A" * 2000  # Longer than 1000 char limit

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            documentation_node(state)

            call_args = mock_llm.return_value.bind_tools.return_value.invoke.call_args
            messages = call_args[0][0]
            # Content should be truncated to ~1000 chars
            total_content = str([getattr(m, "content", "") for m in messages])
            # The message should not contain the full 2000 A's
            assert total_content.count("A") < 2000


class TestDocumentationNodeStatusUpdates:
    """Test documentation_node status updates."""

    def test_sets_status_to_completed(self):
        """Test that status is set to completed."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert result["status"] == "completed"

    def test_includes_doc_result(self):
        """Test that doc_result is set."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Changelog updated successfully"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert "Changelog updated successfully" in result["doc_result"]


class TestDocumentationNodeErrorHandling:
    """Test documentation_node error handling."""

    def test_handles_llm_exception(self):
        """Test handling of LLM exceptions."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = Exception("API Error")

            result = documentation_node(state)
            assert "Error during documentation" in result["doc_result"]
            assert "API Error" in result["doc_result"]
            # Still completes to not block workflow
            assert result["status"] == "completed"

    def test_error_still_increments_iterations(self):
        """Test that iterations are incremented even on error."""
        state = create_initial_state("Test")
        state["doc_iterations"] = 1
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = Exception("Error")

            result = documentation_node(state)
            assert result["doc_iterations"] == 2


class TestRunDocumentationTask:
    """Test standalone run_documentation_task function."""

    def test_returns_dict_with_required_keys(self):
        """Test that run_documentation_task returns correct structure."""
        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_documentation_task(
                task="Add feature",
                files_modified=["js/feature.js"],
                content_result="Added feature code"
            )
            assert "doc_result" in result
            assert "iterations" in result

    def test_passes_all_parameters(self):
        """Test that all parameters are passed correctly."""
        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_documentation_task(
                task="Fix bug",
                files_modified=["js/bug.js"],
                content_result="Fixed the bug",
                task_type="bugfix"
            )
            assert isinstance(result, dict)

    def test_tracks_iterations(self):
        """Test that iterations are tracked."""
        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_documentation_task(
                task="Test",
                files_modified=[],
                content_result=""
            )
            assert result["iterations"] == 1


class TestDocumentationNodeMessageHandling:
    """Test message handling in documentation_node."""

    def test_adds_tool_messages(self):
        """Test that tool responses are added as ToolMessages."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]

        mock_date_tool = MagicMock()
        mock_date_tool.invoke.return_value = "2024-03-15"

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm, \
             patch.dict("agents.documentation.agent.TOOL_MAP", {"get_current_date": mock_date_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "get_current_date",
                "args": {},
                "id": "call_date"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = documentation_node(state)
            assert result["status"] == "completed"

    def test_final_message_without_content(self):
        """Test handling when final message has no content attribute."""
        state = create_initial_state("Test")
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock(spec=[])  # No content attribute
            mock_response.tool_calls = []

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert result["doc_result"] == "Documentation updated"


class TestDocumentationNodeTaskTypes:
    """Test documentation_node with different task types."""

    @pytest.mark.parametrize("task_type", ["feature", "bugfix", "refactor", "docs"])
    def test_handles_all_task_types(self, task_type):
        """Test that all task types are handled."""
        state = create_initial_state("Test")
        state["task_type"] = task_type
        state["files_modified"] = ["test.js"]

        with patch("agents.documentation.agent.create_documentation_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = documentation_node(state)
            assert result["status"] == "completed"
