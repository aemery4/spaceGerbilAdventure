"""
Tests for agents/test/agent.py - Test agent and validator parsing.
"""

import pytest
from unittest.mock import patch, MagicMock

from agents.test.agent import (
    validation_node,
    _analyze_validation,
    _generate_suggestions,
    _extract_checked_files,
    run_quick_validation,
)
from agents.state import create_initial_state


class TestAnalyzeValidation:
    """Test validation output analysis."""

    def test_detects_pass(self, mock_validation_pass):
        result = _analyze_validation(mock_validation_pass, exit_code=0)
        assert result["passed"] is True
        assert result["error_count"] == 0

    def test_detects_fail(self, mock_validation_fail):
        result = _analyze_validation(mock_validation_fail, exit_code=1)
        assert result["passed"] is False
        assert result["error_count"] > 0

    def test_extracts_errors(self, mock_validation_fail):
        result = _analyze_validation(mock_validation_fail, exit_code=1)
        assert len(result["errors"]) >= 1
        # Check that "MISSING" error was captured
        assert any("MISSING" in err or "planet3.js" in err for err in result["errors"])

    def test_includes_raw_output(self, mock_validation_pass):
        result = _analyze_validation(mock_validation_pass, exit_code=0)
        assert "raw_output" in result
        assert "All checks passed" in result["raw_output"]

    def test_handles_empty_output(self):
        result = _analyze_validation("", exit_code=0)
        assert result["passed"] is False  # No "All checks passed" message
        assert result["error_count"] == 0

    def test_nonzero_exit_means_fail(self, mock_validation_pass):
        # Even with "pass" text, non-zero exit should fail
        result = _analyze_validation(mock_validation_pass, exit_code=1)
        assert result["passed"] is False


class TestGenerateSuggestions:
    """Test suggestion generation from errors."""

    def test_suggests_create_file_for_missing(self):
        errors = ["MISSING: js/planet3.js"]
        suggestions = _generate_suggestions(errors)
        assert any("missing" in s.lower() or "create" in s.lower() for s in suggestions)

    def test_suggests_syntax_fix(self):
        errors = ["Syntax error: unexpected token"]
        suggestions = _generate_suggestions(errors)
        assert any("syntax" in s.lower() for s in suggestions)

    def test_suggests_duplicate_fix(self):
        errors = ["Duplicate declaration of 'player'"]
        suggestions = _generate_suggestions(errors)
        assert any("duplicate" in s.lower() for s in suggestions)

    def test_provides_default_suggestion(self):
        errors = ["Some unknown error type"]
        suggestions = _generate_suggestions(errors)
        assert len(suggestions) > 0

    def test_deduplicates_suggestions(self):
        errors = ["Syntax error 1", "Syntax error 2", "Syntax error 3"]
        suggestions = _generate_suggestions(errors)
        # Should deduplicate repeated syntax suggestions
        syntax_suggestions = [s for s in suggestions if "syntax" in s.lower()]
        assert len(syntax_suggestions) <= 1


class TestExtractCheckedFiles:
    """Test file extraction from validation output."""

    def test_extracts_passed_files(self, mock_validation_pass):
        files = _extract_checked_files(mock_validation_pass)
        assert "js/globals.js" in files
        assert "js/planet1.js" in files

    def test_extracts_failed_files(self, mock_validation_fail):
        files = _extract_checked_files(mock_validation_fail)
        assert "js/globals.js" in files

    def test_handles_empty_output(self):
        files = _extract_checked_files("")
        assert files == []

    def test_deduplicates_files(self, mock_validation_pass):
        files = _extract_checked_files(mock_validation_pass)
        assert len(files) == len(set(files))


class TestValidationNode:
    """Test the validation_node function with LLM-based validation."""

    def test_increments_iterations(self, sample_state):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = '{"passed": true, "categories": {}, "summary": "All good"}'

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = validation_node(sample_state)
            assert result["test_iterations"] == 1

    def test_returns_test_result(self, sample_state):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = '{"passed": true, "categories": {}, "summary": "All good"}'

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = validation_node(sample_state)
            assert "test_result" in result
            assert isinstance(result["test_result"], dict)

    def test_sets_status_to_testing(self, sample_state):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = '{"passed": true, "categories": {}, "summary": "All good"}'

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = validation_node(sample_state)
            assert result["status"] == "testing"

    def test_returns_to_orchestrator(self, sample_state):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = '{"passed": true, "categories": {}, "summary": "All good"}'

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = validation_node(sample_state)
            assert result["current_agent"] == "orchestrator"

    def test_handles_llm_failure(self, sample_state):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = Exception("API Error")

            result = validation_node(sample_state)
            assert result["test_result"]["passed"] is False
            assert "error" in result["test_result"]["errors"][0].lower()


class TestRunQuickValidation:
    """Test standalone validation function."""

    def test_returns_dict(self):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_response = MagicMock()
            mock_response.tool_calls = []
            mock_response.content = '{"passed": true, "categories": {}, "summary": "All good"}'

            mock_llm.return_value.bind_tools.return_value.invoke.return_value = mock_response

            result = run_quick_validation()
            assert isinstance(result, dict)
            assert "passed" in result

    def test_handles_llm_error(self):
        with patch("agents.test.agent.create_test_llm") as mock_llm:
            mock_llm.return_value.bind_tools.return_value.invoke.side_effect = Exception("API Error")

            result = run_quick_validation()
            assert result["passed"] is False


class TestValidationParsing:
    """Test specific validation output parsing scenarios."""

    def test_parses_file_check_section(self):
        output = """
📁 Files...
  ✓ js/globals.js
  ✓ js/save.js
  ✗ MISSING: js/newfile.js
"""
        result = _analyze_validation(output, exit_code=1)
        assert result["error_count"] >= 1
        assert any("MISSING" in err or "newfile" in err for err in result["errors"])

    def test_parses_syntax_section(self):
        output = """
🔤 Syntax...
  ✓ js/globals.js
  ✗ js/planet1.js: Unexpected token ';'
"""
        result = _analyze_validation(output, exit_code=1)
        assert any("Unexpected" in err or "planet1" in err for err in result["errors"])

    def test_parses_runtime_section(self):
        output = """
🚀 Runtime...
  ✓ All loaded
  ✗ launchP1: ReferenceError: player is not defined
"""
        result = _analyze_validation(output, exit_code=1)
        assert any("launchP1" in err or "not defined" in err for err in result["errors"])

    def test_parses_html_id_section(self):
        output = """
🆔 HTML IDs...
  ✗ Missing: gameCanvas, healthBar
"""
        result = _analyze_validation(output, exit_code=1)
        assert any("Missing" in err for err in result["errors"])
