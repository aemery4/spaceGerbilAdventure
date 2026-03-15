"""
Tests for agents/content/agent.py - Content agent with mocked LLM calls.

These tests mock ChatAnthropic to test the agent logic without real API calls.
"""

import pytest
from unittest.mock import patch, MagicMock, PropertyMock

from agents.content.agent import (
    content_node,
    create_content_llm,
    run_content_task,
    _load_codebase_contract,
    CONTENT_AGENT_SYSTEM_PROMPT,
    TOOL_MAP,
)
from agents.state import create_initial_state, MAX_CONTENT_ITERATIONS


class TestCreateContentLLM:
    """Test LLM creation."""

    def test_creates_llm_instance(self):
        """Test that create_content_llm creates a ChatAnthropic instance."""
        with patch("agents.content.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            llm = create_content_llm()
            mock_chat.assert_called_once()

    def test_llm_has_correct_model(self):
        """Test that LLM is created with correct model."""
        with patch("agents.content.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            create_content_llm()
            call_kwargs = mock_chat.call_args[1]
            assert call_kwargs["model"] == "claude-sonnet-4-20250514"

    def test_llm_has_correct_settings(self):
        """Test LLM settings."""
        with patch("agents.content.agent.ChatAnthropic") as mock_chat:
            mock_chat.return_value = MagicMock()
            create_content_llm()
            call_kwargs = mock_chat.call_args[1]
            assert call_kwargs["temperature"] == 0
            assert call_kwargs["max_tokens"] == 8192
            assert call_kwargs["max_retries"] == 3
            assert call_kwargs["timeout"] == 120.0


class TestLoadCodebaseContract:
    """Test codebase contract loading."""

    def test_returns_string(self):
        """Test that _load_codebase_contract returns a string."""
        result = _load_codebase_contract()
        assert isinstance(result, str)

    def test_handles_missing_file(self):
        """Test fallback when CLAUDE.md doesn't exist."""
        with patch("builtins.open", side_effect=FileNotFoundError()):
            result = _load_codebase_contract()
            assert "not found" in result.lower() or "caution" in result.lower()


class TestContentAgentSystemPrompt:
    """Test system prompt configuration."""

    def test_prompt_includes_key_sections(self):
        """Test that prompt includes all required sections."""
        assert "Space Gerbil Adventure" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "WORKFLOW" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "AVAILABLE TOOLS" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "CRITICAL RULES" in CONTENT_AGENT_SYSTEM_PROMPT

    def test_prompt_mentions_all_tools(self):
        """Test that prompt mentions all available tools."""
        assert "read_file" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "write_file" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "list_files" in CONTENT_AGENT_SYSTEM_PROMPT
        assert "search_in_files" in CONTENT_AGENT_SYSTEM_PROMPT


class TestToolMap:
    """Test tool mapping configuration."""

    def test_all_tools_mapped(self):
        """Test that all tools are in TOOL_MAP."""
        assert "read_file" in TOOL_MAP
        assert "write_file" in TOOL_MAP
        assert "list_files" in TOOL_MAP
        assert "search_in_files" in TOOL_MAP

    def test_tools_are_callable(self):
        """Test that mapped tools have invoke method."""
        for tool_name, tool in TOOL_MAP.items():
            assert hasattr(tool, "invoke"), f"{tool_name} missing invoke method"


class TestContentNodeIterations:
    """Test content_node iteration handling."""

    def test_increments_iteration_count(self):
        """Test that iteration counter is incremented."""
        state = create_initial_state("Test task")
        state["content_iterations"] = 2

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"
            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = content_node(state)
            assert result["content_iterations"] == 3

    def test_max_iterations_triggers_escalation(self):
        """Test that exceeding max iterations triggers escalation."""
        state = create_initial_state("Test task")
        state["content_iterations"] = MAX_CONTENT_ITERATIONS  # At max

        result = content_node(state)

        assert result["needs_escalation"] is True
        assert "exceeded" in result["escalation_reason"] or "iterations" in result["escalation_reason"]
        assert result["content_iterations"] == MAX_CONTENT_ITERATIONS + 1

    def test_escalation_includes_iteration_count(self):
        """Test escalation message includes iteration count."""
        state = create_initial_state("Test task")
        state["content_iterations"] = MAX_CONTENT_ITERATIONS

        result = content_node(state)
        assert str(MAX_CONTENT_ITERATIONS) in result["escalation_reason"]


class TestContentNodeToolCalls:
    """Test content_node tool calling logic."""

    def test_executes_read_file_tool(self):
        """Test that read_file tool calls are executed."""
        state = create_initial_state("Read a file")

        mock_read_tool = MagicMock()
        mock_read_tool.invoke.return_value = "file content"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"read_file": mock_read_tool}):
            # First response has tool call
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "read_file",
                "args": {"file_path": "js/globals.js"},
                "id": "call_123"
            }]

            # Second response has no tool calls (done)
            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "File read successfully"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = content_node(state)
            mock_read_tool.invoke.assert_called_once_with({"file_path": "js/globals.js"})

    def test_executes_write_file_tool(self):
        """Test that write_file tool calls are executed and tracked."""
        state = create_initial_state("Write a file")

        mock_write_tool = MagicMock()
        mock_write_tool.invoke.return_value = "Success"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"write_file": mock_write_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "write_file",
                "args": {"file_path": "js/test.js", "content": "test"},
                "id": "call_456"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "File written"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = content_node(state)
            assert "js/test.js" in result["files_modified"]

    def test_tracks_multiple_file_modifications(self):
        """Test that multiple file modifications are tracked."""
        state = create_initial_state("Modify multiple files")

        mock_write_tool = MagicMock()
        mock_write_tool.invoke.return_value = "Success"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"write_file": mock_write_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [
                {"name": "write_file", "args": {"file_path": "js/file1.js", "content": "a"}, "id": "1"},
                {"name": "write_file", "args": {"file_path": "js/file2.js", "content": "b"}, "id": "2"},
            ]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = content_node(state)
            assert "js/file1.js" in result["files_modified"]
            assert "js/file2.js" in result["files_modified"]

    def test_handles_unknown_tool(self):
        """Test handling of unknown tool names."""
        state = create_initial_state("Test unknown tool")

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "unknown_tool",
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
            result = content_node(state)
            assert result["status"] == "testing"

    def test_respects_max_tool_rounds(self):
        """Test that tool rounds are limited."""
        state = create_initial_state("Endless tools")

        mock_read_tool = MagicMock()
        mock_read_tool.invoke.return_value = "content"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"read_file": mock_read_tool}):
            # Always returns tool calls
            mock_response = MagicMock()
            mock_response.tool_calls = [{
                "name": "read_file",
                "args": {"file_path": "js/test.js"},
                "id": "call_loop"
            }]
            mock_response.content = "Still working"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = content_node(state)
            # Should complete after max rounds (5)
            assert mock_llm.return_value.bind_tools.return_value.invoke.call_count == 5


class TestContentNodeTestContext:
    """Test content_node handling of previous test failures."""

    def test_includes_previous_errors_in_context(self):
        """Test that previous test errors are passed to LLM."""
        state = create_initial_state("Fix errors")
        state["test_result"] = {
            "passed": False,
            "errors": ["Syntax error", "Missing variable"]
        }

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Fixed"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            content_node(state)

            # Check that the errors were included in messages
            call_args = mock_llm.return_value.bind_tools.return_value.invoke.call_args
            messages = call_args[0][0]
            human_msg = [m for m in messages if hasattr(m, "content") and "PREVIOUS TEST FAILURES" in str(m.content)]
            assert len(human_msg) > 0


class TestContentNodeStatusUpdates:
    """Test content_node status updates."""

    def test_sets_status_to_testing(self):
        """Test that status is set to testing after completion."""
        state = create_initial_state("Test task")

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = content_node(state)
            assert result["status"] == "testing"

    def test_includes_content_result(self):
        """Test that content_result is set."""
        state = create_initial_state("Test task")

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Task completed successfully"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = content_node(state)
            assert "Task completed successfully" in result["content_result"]


class TestContentNodeErrorHandling:
    """Test content_node error handling."""

    def test_handles_llm_exception(self):
        """Test handling of LLM exceptions."""
        state = create_initial_state("Test task")

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = Exception("API Error")

            result = content_node(state)
            assert "Error during content generation" in result["content_result"]
            assert "API Error" in result["content_result"]
            assert result["status"] == "testing"

    def test_error_preserves_files_modified(self):
        """Test that files_modified is preserved on error."""
        state = create_initial_state("Test task")

        mock_write_tool = MagicMock()
        mock_write_tool.invoke.return_value = "Success"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"write_file": mock_write_tool}):
            # First successful call with write
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "write_file",
                "args": {"file_path": "js/test.js", "content": "x"},
                "id": "call_1"
            }]

            # Then error
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                Exception("Error")
            ]

            result = content_node(state)
            assert "js/test.js" in result["files_modified"]


class TestRunContentTask:
    """Test standalone run_content_task function."""

    def test_returns_dict_with_required_keys(self):
        """Test that run_content_task returns correct structure."""
        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_content_task("Test task")
            assert "content_result" in result
            assert "files_modified" in result
            assert "iterations" in result

    def test_passes_task_type(self):
        """Test that task_type is passed correctly."""
        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Fixed"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_content_task("Fix bug", task_type="bugfix")
            assert isinstance(result, dict)

    def test_tracks_iterations(self):
        """Test that iterations are tracked."""
        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_content_task("Test")
            assert result["iterations"] == 1


class TestContentNodeMessageHandling:
    """Test message handling in content_node."""

    def test_adds_tool_messages(self):
        """Test that tool responses are added as ToolMessages."""
        state = create_initial_state("Test")

        mock_list_tool = MagicMock()
        mock_list_tool.invoke.return_value = "file1.js\nfile2.js"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"list_files": mock_list_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [{
                "name": "list_files",
                "args": {},
                "id": "call_list"
            }]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = content_node(state)
            # Verify messages are returned
            assert "messages" in result

    def test_final_message_without_content(self):
        """Test handling when final message has no content attribute."""
        state = create_initial_state("Test")

        with patch("agents.content.agent.create_content_llm") as mock_llm:
            mock_response = MagicMock(spec=[])  # No content attribute
            mock_response.tool_calls = []

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = content_node(state)
            assert result["content_result"] == "Task completed"


class TestContentNodeDeduplication:
    """Test file modification deduplication."""

    def test_deduplicates_modified_files(self):
        """Test that duplicate file modifications are deduplicated."""
        state = create_initial_state("Edit same file twice")

        mock_write_tool = MagicMock()
        mock_write_tool.invoke.return_value = "Success"

        with patch("agents.content.agent.create_content_llm") as mock_llm, \
             patch.dict("agents.content.agent.TOOL_MAP", {"write_file": mock_write_tool}):
            mock_tool_response = MagicMock()
            mock_tool_response.tool_calls = [
                {"name": "write_file", "args": {"file_path": "js/test.js", "content": "v1"}, "id": "1"},
                {"name": "write_file", "args": {"file_path": "js/test.js", "content": "v2"}, "id": "2"},
            ]

            mock_done_response = MagicMock()
            mock_done_response.tool_calls = []
            mock_done_response.content = "Done"

            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = [
                mock_tool_response,
                mock_done_response
            ]

            result = content_node(state)
            # Should only have one entry for the file
            assert result["files_modified"].count("js/test.js") == 1
