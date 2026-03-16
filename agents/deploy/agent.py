"""
Deploy Agent for SGA Multi-Agent System.

The Deploy agent handles git operations after successful changes:
1. Stages modified files
2. Creates a commit with task summary
3. Syncs changes to docs folder for GitHub Pages
4. Pushes to remote repository
"""

import os
import subprocess
import sys
from typing import Optional

from ..state import AgentState

# Path to game code and docs
GAME_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "code", "game_v3")
DOCS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "docs")
REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")


def run_git_command(args: list[str], cwd: str = None) -> tuple[bool, str]:
    """
    Run a git command and return success status and output.

    Args:
        args: Git command arguments (without 'git' prefix)
        cwd: Working directory (defaults to repo root)

    Returns:
        Tuple of (success: bool, output: str)
    """
    if cwd is None:
        cwd = os.path.abspath(REPO_ROOT)

    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout + result.stderr
        return result.returncode == 0, output.strip()
    except subprocess.TimeoutExpired:
        return False, "Git command timed out"
    except Exception as e:
        return False, f"Git error: {str(e)}"


def sync_to_docs(files_modified: list[str]) -> list[str]:
    """
    Sync modified game files to docs folder for GitHub Pages.

    Args:
        files_modified: List of modified file paths (relative to game_v3)

    Returns:
        List of docs files that were synced
    """
    synced = []

    for file_path in files_modified:
        # Normalize path
        if file_path.startswith("js/"):
            src = os.path.join(GAME_PATH, file_path)
            dst = os.path.join(DOCS_PATH, file_path)

            if os.path.exists(src):
                # Ensure destination directory exists
                os.makedirs(os.path.dirname(dst), exist_ok=True)

                # Copy file
                import shutil
                shutil.copy2(src, dst)
                synced.append(f"docs/{file_path}")

    return synced


def deploy_node(state: AgentState) -> dict:
    """
    Deploy node function for the StateGraph.

    Handles git commit and push after successful task completion.

    Args:
        state: Current AgentState

    Returns:
        Partial state update dict
    """
    def log(msg):
        print(f"[Deploy Agent] {msg}", file=sys.stderr)

    files_modified = state.get("files_modified", [])
    task = state.get("task", "Unknown task")
    task_type = state.get("task_type", "update")

    if not files_modified:
        log("No files modified, skipping deploy")
        return {"deploy_result": "No files to deploy"}

    log(f"Deploying {len(files_modified)} modified files...")

    # Sync to docs folder
    docs_synced = sync_to_docs(files_modified)
    if docs_synced:
        log(f"Synced to docs: {', '.join(docs_synced)}")

    # Build list of files to stage
    files_to_stage = []
    for f in files_modified:
        files_to_stage.append(f"code/game_v3/{f}")
    files_to_stage.extend(docs_synced)
    files_to_stage.append("CHANGELOG.md")  # Always include changelog

    # Stage files
    success, output = run_git_command(["add"] + files_to_stage)
    if not success:
        log(f"Failed to stage files: {output}")
        return {"deploy_result": f"Git add failed: {output}"}

    # Check if there are changes to commit
    success, output = run_git_command(["diff", "--cached", "--quiet"])
    if success:
        log("No changes to commit (already committed?)")
        return {"deploy_result": "No changes to commit"}

    # Create commit message
    task_summary = task[:50] + "..." if len(task) > 50 else task
    commit_type = "Fix" if task_type == "bug" else "Add" if task_type == "feature" else "Update"
    commit_msg = f"""{commit_type}: {task_summary}

Modified files:
{chr(10).join('- ' + f for f in files_modified)}

Automated commit by SGA orchestrator.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"""

    # Commit
    success, output = run_git_command(["commit", "-m", commit_msg])
    if not success:
        log(f"Failed to commit: {output}")
        return {"deploy_result": f"Git commit failed: {output}"}

    log(f"Committed changes")

    # Push
    success, output = run_git_command(["push"])
    if not success:
        log(f"Failed to push: {output}")
        return {"deploy_result": f"Git push failed: {output}"}

    log(f"Pushed to remote")

    return {
        "deploy_result": "Successfully committed and pushed",
        "status": "completed",
    }
