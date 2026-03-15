"""
Tests for agents/content/tools.py - File operation tools.
"""

import os
import pytest
import tempfile
import shutil
from unittest.mock import patch

from agents.content.tools import (
    read_file,
    write_file,
    list_files,
    search_in_files,
    ALLOWED_FILES,
    GAME_CODE_PATH,
)


class TestReadFile:
    """Test read_file tool."""

    def test_read_existing_file(self, temp_game_dir):
        """Test reading a file that exists."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = read_file.invoke({"file_path": "js/globals.js"})
            assert "const save" in result

    def test_read_nonexistent_file(self, temp_game_dir):
        """Test reading a file that doesn't exist."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = read_file.invoke({"file_path": "js/nonexistent.js"})
            assert "Error" in result
            assert "not found" in result

    def test_read_normalizes_path(self, temp_game_dir):
        """Test that paths are normalized (backslash -> forward slash)."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = read_file.invoke({"file_path": "js\\globals.js"})
            assert "const save" in result

    def test_read_strips_leading_slash(self, temp_game_dir):
        """Test that leading slashes are stripped."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = read_file.invoke({"file_path": "/js/globals.js"})
            assert "const save" in result

    def test_read_prevents_directory_traversal(self, temp_game_dir):
        """Test that directory traversal is blocked."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = read_file.invoke({"file_path": "../../../etc/passwd"})
            assert "Error" in result


class TestWriteFile:
    """Test write_file tool."""

    def test_write_allowed_file(self, temp_game_dir):
        """Test writing to an allowed file."""
        # Temporarily add our test file to allowed list
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            with patch("agents.content.tools.ALLOWED_FILES", ["js/globals.js"]):
                result = write_file.invoke({
                    "file_path": "js/globals.js",
                    "content": "// New content\nconst x = 1;\n"
                })
                assert "Successfully" in result

                # Verify content was written
                with open(os.path.join(temp_game_dir, "js/globals.js")) as f:
                    content = f.read()
                assert "// New content" in content

    def test_write_disallowed_file(self, temp_game_dir):
        """Test that writing to non-allowed files is blocked."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = write_file.invoke({
                "file_path": "js/hacker.js",
                "content": "malicious code"
            })
            assert "Error" in result
            assert "Cannot modify" in result

    def test_write_creates_file_if_not_exists(self, temp_game_dir):
        """Test that write_file creates new files."""
        new_file = "js/planet3.js"
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            with patch("agents.content.tools.ALLOWED_FILES", [new_file]):
                result = write_file.invoke({
                    "file_path": new_file,
                    "content": "function launchP3() {}\n"
                })
                assert "Successfully" in result
                assert os.path.exists(os.path.join(temp_game_dir, new_file))

    def test_write_reports_bytes_written(self, temp_game_dir):
        """Test that write reports number of bytes written."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            with patch("agents.content.tools.ALLOWED_FILES", ["js/globals.js"]):
                content = "x" * 100
                result = write_file.invoke({
                    "file_path": "js/globals.js",
                    "content": content
                })
                assert "100 bytes" in result


class TestListFiles:
    """Test list_files tool."""

    def test_list_returns_files(self, temp_game_dir):
        """Test that list_files returns files."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = list_files.invoke({})
            assert "globals.js" in result
            assert "planet1.js" in result
            assert "index.html" in result

    def test_list_shows_file_sizes(self, temp_game_dir):
        """Test that list_files shows file sizes."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = list_files.invoke({})
            assert "bytes" in result

    def test_list_handles_empty_directory(self):
        """Test list_files with empty directory."""
        empty_dir = tempfile.mkdtemp()
        try:
            with patch("agents.content.tools.GAME_CODE_PATH", empty_dir):
                result = list_files.invoke({})
                assert "Files in game directory" in result
        finally:
            shutil.rmtree(empty_dir)


class TestSearchInFiles:
    """Test search_in_files tool."""

    def test_search_finds_matches(self, temp_game_dir):
        """Test that search finds matching content."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = search_in_files.invoke({
                "search_term": "launchP1",
                "file_pattern": "*.js"
            })
            assert "planet1.js" in result
            assert "Found" in result

    def test_search_case_insensitive(self, temp_game_dir):
        """Test that search is case-insensitive."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = search_in_files.invoke({
                "search_term": "LAUNCHP1",
                "file_pattern": "*.js"
            })
            assert "planet1.js" in result

    def test_search_no_matches(self, temp_game_dir):
        """Test search with no matches."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = search_in_files.invoke({
                "search_term": "nonexistentfunction",
                "file_pattern": "*.js"
            })
            assert "No matches found" in result

    def test_search_with_file_pattern(self, temp_game_dir):
        """Test search with specific file pattern."""
        with patch("agents.content.tools.GAME_CODE_PATH", temp_game_dir):
            result = search_in_files.invoke({
                "search_term": "save",
                "file_pattern": "globals.js"
            })
            assert "globals.js" in result


class TestAllowedFiles:
    """Test ALLOWED_FILES constant."""

    def test_allowed_files_includes_core_js(self):
        """Test that core JS files are in allowed list."""
        assert "js/globals.js" in ALLOWED_FILES
        assert "js/planet1.js" in ALLOWED_FILES
        assert "js/planet2.js" in ALLOWED_FILES
        assert "js/planet3.js" in ALLOWED_FILES

    def test_allowed_files_includes_html(self):
        """Test that index.html is allowed."""
        assert "index.html" in ALLOWED_FILES

    def test_allowed_files_does_not_include_validate(self):
        """Test that validate.js is not in allowed list (system file)."""
        assert "validate.js" not in ALLOWED_FILES
