"""
Tests for agents/documentation/tools.py - Changelog tools.
"""

import os
import pytest
import tempfile
import shutil
from datetime import datetime
from unittest.mock import patch

from agents.documentation.tools import (
    read_changelog,
    write_changelog,
    get_current_date,
    CHANGELOG_PATH,
)


class TestReadChangelog:
    """Test read_changelog tool."""

    def test_reads_existing_changelog(self, temp_changelog):
        """Test reading an existing CHANGELOG.md."""
        with patch("agents.documentation.tools.CHANGELOG_PATH", temp_changelog):
            result = read_changelog.invoke({})
            assert "# Changelog" in result
            assert "[Unreleased]" in result
            assert "Initial release" in result

    def test_returns_template_if_not_exists(self):
        """Test that missing changelog returns a template."""
        with patch("agents.documentation.tools.CHANGELOG_PATH", "/nonexistent/CHANGELOG.md"):
            result = read_changelog.invoke({})
            assert "# Changelog" in result
            assert "[Unreleased]" in result
            assert "Keep a Changelog" in result

    def test_template_has_correct_format(self):
        """Test that the template follows Keep a Changelog format."""
        with patch("agents.documentation.tools.CHANGELOG_PATH", "/nonexistent/CHANGELOG.md"):
            result = read_changelog.invoke({})
            assert "## [Unreleased]" in result


class TestWriteChangelog:
    """Test write_changelog tool."""

    def test_writes_content(self, temp_changelog):
        """Test writing to CHANGELOG.md."""
        new_content = "# New Changelog\n\n## [Unreleased]\n- New entry\n"

        with patch("agents.documentation.tools.CHANGELOG_PATH", temp_changelog):
            result = write_changelog.invoke({"content": new_content})
            assert "Successfully" in result

            # Verify content was written
            with open(temp_changelog) as f:
                written = f.read()
            assert "New entry" in written

    def test_reports_bytes_written(self, temp_changelog):
        """Test that write reports bytes written."""
        content = "x" * 500

        with patch("agents.documentation.tools.CHANGELOG_PATH", temp_changelog):
            result = write_changelog.invoke({"content": content})
            assert "500 bytes" in result

    def test_creates_file_if_not_exists(self):
        """Test creating a new CHANGELOG.md."""
        temp_dir = tempfile.mkdtemp()
        new_changelog = os.path.join(temp_dir, "CHANGELOG.md")

        try:
            with patch("agents.documentation.tools.CHANGELOG_PATH", new_changelog):
                result = write_changelog.invoke({"content": "# New\n"})
                assert "Successfully" in result
                assert os.path.exists(new_changelog)
        finally:
            shutil.rmtree(temp_dir)

    def test_handles_write_error(self):
        """Test handling write errors (permission denied, etc.)."""
        # Use an invalid path
        with patch("agents.documentation.tools.CHANGELOG_PATH", "/invalid/path/CHANGELOG.md"):
            result = write_changelog.invoke({"content": "test"})
            assert "Error" in result


class TestGetCurrentDate:
    """Test get_current_date tool."""

    def test_returns_date_string(self):
        """Test that a date string is returned."""
        result = get_current_date.invoke({})
        assert isinstance(result, str)
        assert len(result) == 10  # YYYY-MM-DD format

    def test_returns_correct_format(self):
        """Test YYYY-MM-DD format."""
        result = get_current_date.invoke({})
        parts = result.split("-")
        assert len(parts) == 3
        assert len(parts[0]) == 4  # Year
        assert len(parts[1]) == 2  # Month
        assert len(parts[2]) == 2  # Day

    def test_returns_current_date(self):
        """Test that the current date is returned."""
        result = get_current_date.invoke({})
        today = datetime.now().strftime("%Y-%m-%d")
        assert result == today


class TestChangelogIntegration:
    """Integration tests for changelog operations."""

    def test_read_modify_write_cycle(self, temp_changelog):
        """Test reading, modifying, and writing changelog."""
        with patch("agents.documentation.tools.CHANGELOG_PATH", temp_changelog):
            # Read
            original = read_changelog.invoke({})
            assert "Initial release" in original

            # Modify
            modified = original.replace(
                "## [Unreleased]",
                "## [Unreleased]\n\n### Added\n- New feature\n"
            )

            # Write
            result = write_changelog.invoke({"content": modified})
            assert "Successfully" in result

            # Verify
            final = read_changelog.invoke({})
            assert "New feature" in final
            assert "Initial release" in final  # Preserved

    def test_preserves_existing_entries(self, temp_changelog):
        """Test that existing entries are preserved."""
        with patch("agents.documentation.tools.CHANGELOG_PATH", temp_changelog):
            original = read_changelog.invoke({})

            # Add new entry
            new_entry = "- Brand new entry\n"
            modified = original.replace(
                "### Added\n",
                f"### Added\n{new_entry}"
            )

            write_changelog.invoke({"content": modified})
            final = read_changelog.invoke({})

            # Both old and new should exist
            assert "Initial release" in final
            assert "Brand new entry" in final


class TestChangelogPath:
    """Test changelog path configuration."""

    def test_changelog_path_is_absolute(self):
        """Test that CHANGELOG_PATH is an absolute path."""
        assert os.path.isabs(CHANGELOG_PATH)

    def test_changelog_path_ends_with_filename(self):
        """Test that path ends with CHANGELOG.md."""
        assert CHANGELOG_PATH.endswith("CHANGELOG.md")
