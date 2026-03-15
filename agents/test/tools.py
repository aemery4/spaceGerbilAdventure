"""
Read-only file tools for the Test Agent.

The Test Agent has read-only access to all game files for validation purposes.
"""

import os
import fnmatch
from langchain_core.tools import tool

# Base path to game code
GAME_CODE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "code", "game_v3")


@tool
def read_game_file(file_path: str) -> str:
    """
    Read the contents of a game file (read-only access).

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
def list_game_files() -> str:
    """
    List all JavaScript and HTML files in the game directory.

    Returns:
        List of files with their sizes
    """
    try:
        files = []
        for root, dirs, filenames in os.walk(GAME_CODE_PATH):
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
def search_game_files(search_term: str, file_pattern: str = "*.js") -> str:
    """
    Search for a term across game files (read-only).

    Args:
        search_term: Text to search for (case-insensitive)
        file_pattern: File pattern to search (e.g., "*.js", "planet*.js")

    Returns:
        Matching lines with file and line number
    """
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
            return f"Found {len(results)} matches:\n" + "\n".join(results[:50])
        return f"No matches found for '{search_term}'"
    except Exception as e:
        return f"Error searching: {str(e)}"


@tool
def get_files_modified(files_list: str) -> str:
    """
    Read multiple game files at once to analyze Content Agent changes.

    Args:
        files_list: Comma-separated list of file paths (e.g., "js/planet1.js,js/globals.js")

    Returns:
        Contents of all requested files with clear separators
    """
    file_paths = [f.strip() for f in files_list.split(",")]
    results = []

    for file_path in file_paths:
        file_path = file_path.replace("\\", "/").lstrip("/")
        full_path = os.path.normpath(os.path.join(GAME_CODE_PATH, file_path))

        if not full_path.startswith(os.path.normpath(GAME_CODE_PATH)):
            results.append(f"=== {file_path} ===\nError: Cannot read files outside game directory")
            continue

        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
                results.append(f"=== {file_path} ===\n{content}")
        except FileNotFoundError:
            results.append(f"=== {file_path} ===\nError: File not found")
        except Exception as e:
            results.append(f"=== {file_path} ===\nError: {str(e)}")

    return "\n\n".join(results)


# Export tools list for the Test agent (read-only tools only)
TEST_TOOLS = [read_game_file, list_game_files, search_game_files, get_files_modified]
