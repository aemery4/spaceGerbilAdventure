"""
File operation tools for the Content agent.

These tools allow the Content agent to read and modify game files
following the codebase contract defined in CLAUDE.md.
"""

import os
from typing import Optional
from langchain_core.tools import tool

# Base path to game code
GAME_CODE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "code", "game_v3")

# Allowed files that Content agent can modify
ALLOWED_FILES = [
    "js/globals.js",
    "js/save.js",
    "js/hud.js",
    "js/craft.js",
    "js/menu.js",
    "js/planet1.js",
    "js/planet2.js",
    "js/planet3.js",
    "js/p3-data.js",
    "js/p3-draw.js",
    "js/p3-logic.js",
    "js/skins.js",
    "index.html",
]


@tool
def read_file(file_path: str) -> str:
    """
    Read the contents of a game file.

    Args:
        file_path: Relative path from game_v3 folder (e.g., "js/planet1.js", "index.html")

    Returns:
        File contents as string, or error message if file not found
    """
    # Normalize path
    file_path = file_path.replace("\\", "/").lstrip("/")

    # Security check - only allow reading from game directory
    full_path = os.path.normpath(os.path.join(GAME_CODE_PATH, file_path))
    if not full_path.startswith(os.path.normpath(GAME_CODE_PATH)):
        return f"Error: Cannot read files outside game directory"

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"Error: File not found: {file_path}"
    except Exception as e:
        return f"Error reading file: {str(e)}"


@tool
def write_file(file_path: str, content: str) -> str:
    """
    Write content to a game file. Creates the file if it doesn't exist.

    Args:
        file_path: Relative path from game_v3 folder (e.g., "js/planet3.js")
        content: The complete file content to write

    Returns:
        Success message or error
    """
    # Normalize path
    file_path = file_path.replace("\\", "/").lstrip("/")

    # Check if file is in allowed list
    if file_path not in ALLOWED_FILES:
        return f"Error: Cannot modify {file_path}. Allowed files: {', '.join(ALLOWED_FILES)}"

    full_path = os.path.normpath(os.path.join(GAME_CODE_PATH, file_path))

    # Security check
    if not full_path.startswith(os.path.normpath(GAME_CODE_PATH)):
        return f"Error: Cannot write files outside game directory"

    try:
        # Create directory if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote {len(content)} bytes to {file_path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"


@tool
def list_files() -> str:
    """
    List all JavaScript and HTML files in the game directory.

    Returns:
        List of files with their sizes
    """
    try:
        files = []
        for root, dirs, filenames in os.walk(GAME_CODE_PATH):
            # Skip node_modules or other non-essential dirs
            dirs[:] = [d for d in dirs if d not in ["node_modules", ".git"]]

            for filename in filenames:
                if filename.endswith((".js", ".html", ".md")):
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, GAME_CODE_PATH).replace("\\", "/")
                    size = os.path.getsize(full_path)
                    files.append(f"{rel_path} ({size} bytes)")

        return "Files in game directory:\n" + "\n".join(sorted(files))
    except Exception as e:
        return f"Error listing files: {str(e)}"


@tool
def search_in_files(search_term: str, file_pattern: str = "*.js") -> str:
    """
    Search for a term across game files.

    Args:
        search_term: Text to search for (case-insensitive)
        file_pattern: File pattern to search (e.g., "*.js", "planet*.js")

    Returns:
        Matching lines with file and line number
    """
    import fnmatch

    results = []
    search_lower = search_term.lower()

    try:
        for root, dirs, filenames in os.walk(GAME_CODE_PATH):
            dirs[:] = [d for d in dirs if d not in ["node_modules", ".git"]]

            for filename in filenames:
                if fnmatch.fnmatch(filename, file_pattern):
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, GAME_CODE_PATH).replace("\\", "/")

                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            for i, line in enumerate(f, 1):
                                if search_lower in line.lower():
                                    results.append(f"{rel_path}:{i}: {line.strip()[:100]}")
                    except:
                        continue

        if results:
            return f"Found {len(results)} matches:\n" + "\n".join(results[:50])  # Limit to 50
        return f"No matches found for '{search_term}'"
    except Exception as e:
        return f"Error searching: {str(e)}"


# Export tools list for the agent
CONTENT_TOOLS = [read_file, write_file, list_files, search_in_files]
