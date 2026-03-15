"""
Tools for the Documentation agent.

The Documentation agent exclusively manages CHANGELOG.md, tracking all
changes made to the game codebase.
"""

import os
from datetime import datetime
from langchain_core.tools import tool

# Path to CHANGELOG.md in the project root
CHANGELOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "CHANGELOG.md")


@tool
def read_changelog() -> str:
    """
    Read the current CHANGELOG.md contents.

    Returns:
        The full contents of CHANGELOG.md, or a template if it doesn't exist.
    """
    try:
        with open(CHANGELOG_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        # Return a template for new changelog
        return """# Changelog

All notable changes to Space Gerbil Adventure will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

"""


@tool
def write_changelog(content: str) -> str:
    """
    Write updated content to CHANGELOG.md.

    Args:
        content: The complete new content for CHANGELOG.md

    Returns:
        Success or error message
    """
    try:
        with open(CHANGELOG_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully updated CHANGELOG.md ({len(content)} bytes)"
    except Exception as e:
        return f"Error writing CHANGELOG.md: {str(e)}"


@tool
def get_current_date() -> str:
    """
    Get the current date in YYYY-MM-DD format for changelog entries.

    Returns:
        Current date string
    """
    return datetime.now().strftime("%Y-%m-%d")


# Export tools list
DOCUMENTATION_TOOLS = [read_changelog, write_changelog, get_current_date]
