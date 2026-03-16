"""
Game Creator Portal Server for Space Gerbil Adventure.

A Flask server that receives bug reports and feature requests from the
kid-friendly web portal and routes them to the LangGraph orchestrator.
"""

import os
import sys
import json
import uuid
from datetime import datetime
from pathlib import Path

# Load environment variables from .env file
# Check portal/.env first, then fall back to project root .env
from dotenv import load_dotenv
portal_env = Path(__file__).parent / ".env"
root_env = Path(__file__).parent.parent / ".env"
if portal_env.exists():
    load_dotenv(portal_env)
elif root_env.exists():
    load_dotenv(root_env)

from flask import Flask, request, jsonify
from flask_cors import CORS

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Try to import orchestrator
try:
    from agents.graph import run_task, create_sga_graph
    from agents.state import create_initial_state
    ORCHESTRATOR_AVAILABLE = True
    print("Orchestrator loaded successfully!")
except ImportError as e:
    print(f"Warning: Could not import orchestrator: {e}")
    print("Running in standalone mode (submissions will be queued but not processed)")
    ORCHESTRATOR_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Allow requests from the HTML page

# Storage for submissions
SUBMISSIONS_DIR = Path(__file__).parent / "submissions"
SUBMISSIONS_DIR.mkdir(exist_ok=True)

# Task queue file
QUEUE_FILE = SUBMISSIONS_DIR / "task_queue.json"
ARCHIVE_FILE = SUBMISSIONS_DIR / "task_archive.json"


def load_queue() -> list:
    """Load the task queue from disk."""
    if QUEUE_FILE.exists():
        with open(QUEUE_FILE) as f:
            return json.load(f)
    return []


def save_queue(queue: list):
    """Save the task queue to disk."""
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)


def load_archive() -> list:
    """Load the archived tasks from disk."""
    if ARCHIVE_FILE.exists():
        with open(ARCHIVE_FILE) as f:
            return json.load(f)
    return []


def save_archive(archive: list):
    """Save the archived tasks to disk."""
    with open(ARCHIVE_FILE, "w") as f:
        json.dump(archive, f, indent=2)


def format_bug_task(data: dict) -> str:
    """
    Convert a kid's bug report into a task description for the orchestrator.

    Args:
        data: Bug report data from the form

    Returns:
        Formatted task string for the orchestrator
    """
    planet_names = {
        "menu": "the main menu",
        "planet1": "Planet 1 (Earth/Area 51)",
        "planet2": "Planet 2 (Jungle Planet Zorbax)",
        "planet3": "Planet 3 (Tundra Frigia)",
        "other": "an unknown location"
    }

    planet = planet_names.get(data.get("planet", "other"), "an unknown location")
    title = data.get("title", "Unknown bug")
    details = data.get("details", "No details provided")
    submitter = data.get("submitter", "Anonymous")

    task = f"""BUG REPORT from {submitter}

Location: {planet}
Issue: {title}

Details:
{details}

---
Please investigate this bug and fix it if confirmed. Run the validator after any changes.
"""
    return task


def format_feature_task(data: dict) -> str:
    """
    Convert a kid's feature request into a task description for the orchestrator.

    Args:
        data: Feature request data from the form

    Returns:
        Formatted task string for the orchestrator
    """
    category_names = {
        "new_planet": "New Planet/Level",
        "new_enemy": "New Enemy/Boss",
        "new_item": "New Item/Power-up",
        "new_skin": "New Gerbil Skin",
        "gameplay": "Gameplay Change",
        "visual": "Graphics/Visual Effect",
        "sound": "Sound/Music",
        "other": "Other"
    }

    category = category_names.get(data.get("category", "other"), "Other")
    title = data.get("title", "Unknown feature")
    details = data.get("details", "No details provided")
    submitter = data.get("submitter", "Anonymous")

    task = f"""FEATURE REQUEST from {submitter}

Category: {category}
Feature: {title}

Description:
{details}

---
Please evaluate this feature request. If feasible, implement it following the game's coding conventions.
Run the validator after any changes.
"""
    return task


def write_log(task_id: str, message: str):
    """Write a message to the task's processing log."""
    log_file = SUBMISSIONS_DIR / f"{task_id}.log"
    timestamp = datetime.now().strftime("%H:%M:%S")
    with open(log_file, "a") as f:
        f.write(f"[{timestamp}] {message}\n")
    print(f"[{task_id}] {message}")


def run_orchestrator(task: str, task_id: str) -> dict:
    """
    Run the LangGraph orchestrator with the given task.

    Args:
        task: The formatted task description
        task_id: Unique ID for this task

    Returns:
        Result dictionary from the orchestrator
    """
    import concurrent.futures

    # Hard timeout for entire orchestrator run (30 minutes for complex features)
    ORCHESTRATOR_TIMEOUT = 1800

    # Clear previous log
    log_file = SUBMISSIONS_DIR / f"{task_id}.log"
    if log_file.exists():
        log_file.unlink()

    if not ORCHESTRATOR_AVAILABLE:
        write_log(task_id, "Orchestrator not available - task queued only")
        return {
            "status": "queued",
            "message": "Orchestrator not available. Task has been queued for manual processing."
        }

    # Check for API key before attempting to process
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        write_log(task_id, "ERROR: ANTHROPIC_API_KEY not set!")
        write_log(task_id, "Please create a .env file in the portal/ or project root directory with:")
        write_log(task_id, "ANTHROPIC_API_KEY=your-api-key-here")
        return {
            "status": "error",
            "message": "API key not configured. Please set ANTHROPIC_API_KEY in a .env file."
        }

    def _run_with_logging():
        """Inner function to run in thread with timeout."""
        write_log(task_id, "Starting orchestrator...")
        write_log(task_id, f"Task: {task[:100]}...")
        write_log(task_id, "API key is configured (validated)")
        write_log(task_id, "Invoking LangGraph agent system...")

        # Pass log callback so workflow steps appear in task log
        def task_log(msg):
            write_log(task_id, msg)

        result = run_task(task, log_callback=task_log)

        write_log(task_id, f"Completed with status: {result.get('status', 'unknown')}")
        write_log(task_id, f"Iterations: {result.get('iteration', 0)}")
        write_log(task_id, f"Final agent: {result.get('current_agent', 'none')}")

        return result

    try:
        # Run with hard timeout using ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_with_logging)
            try:
                result = future.result(timeout=ORCHESTRATOR_TIMEOUT)
            except concurrent.futures.TimeoutError:
                write_log(task_id, f"TIMEOUT: Orchestrator exceeded {ORCHESTRATOR_TIMEOUT}s limit")
                write_log(task_id, "This usually means the API is not responding or credits are depleted.")
                return {
                    "status": "error",
                    "message": f"Processing timed out after {ORCHESTRATOR_TIMEOUT} seconds. Check API credits and try again."
                }

        # Check if clarification is needed
        if result.get("needs_clarification"):
            write_log(task_id, f"Clarification needed: {result.get('clarification_question')}")
            return {
                "status": "awaiting_clarification",
                "needs_clarification": True,
                "clarification_question": result.get("clarification_question"),
                "clarification_options": result.get("clarification_options", []),
                "interpretation_result": result.get("interpretation_result", {}),
            }

        return {
            "status": result.get("status", "completed"),
            "agent_outputs": result.get("agent_outputs", {}),
            "iterations": result.get("iteration", 0),
            "current_agent": result.get("current_agent"),
            "test_results": result.get("test_results", {})
        }

    except ValueError as e:
        # Handle configuration errors (like missing API key)
        write_log(task_id, f"CONFIGURATION ERROR: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        write_log(task_id, f"ERROR: {error_msg}")

        # Check for common error types
        if "timeout" in error_msg.lower():
            write_log(task_id, "The API request timed out. This could be due to network issues or API overload.")
        elif "unauthorized" in error_msg.lower() or "401" in error_msg:
            write_log(task_id, "API key appears to be invalid. Please check your ANTHROPIC_API_KEY.")
        elif "rate" in error_msg.lower():
            write_log(task_id, "Rate limit exceeded. Please wait and try again.")
        elif "credit balance" in error_msg.lower() or "billing" in error_msg.lower():
            write_log(task_id, "BILLING ERROR: Your Anthropic API credit balance is too low.")
            write_log(task_id, "Please add credits at: https://console.anthropic.com/settings/billing")

        traceback.print_exc()
        return {
            "status": "error",
            "message": error_msg
        }


@app.route("/")
def home():
    """Redirect to the portal page."""
    return """
    <html>
    <head><meta http-equiv="refresh" content="0; url=/portal"></head>
    <body><a href="/portal">Go to Game Creator Portal</a></body>
    </html>
    """


@app.route("/portal")
def portal():
    """Serve the portal HTML page."""
    html_path = Path(__file__).parent / "game_creator.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf-8")
    return "Portal page not found", 404


@app.route("/submit", methods=["POST"])
def submit():
    """
    Handle bug report and feature request submissions.

    Accepts JSON with:
        - type: 'bug' or 'feature'
        - title: Short description
        - details: Full description
        - planet/category: Location or feature type
        - submitter: Optional name

    Returns:
        JSON with success status and task_id
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No data received"}), 400

        submission_type = data.get("type")
        if submission_type not in ("bug", "feature"):
            return jsonify({"success": False, "error": "Invalid submission type"}), 400

        # Generate task ID
        task_id = f"{submission_type[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"

        # Format the task
        if submission_type == "bug":
            task = format_bug_task(data)
        else:
            task = format_feature_task(data)

        # Save submission to disk
        submission = {
            "task_id": task_id,
            "type": submission_type,
            "data": data,
            "formatted_task": task,
            "timestamp": datetime.now().isoformat(),
            "status": "pending"
        }

        submission_file = SUBMISSIONS_DIR / f"{task_id}.json"
        with open(submission_file, "w") as f:
            json.dump(submission, f, indent=2)

        # Add to queue
        queue = load_queue()
        queue.append({
            "task_id": task_id,
            "type": submission_type,
            "title": data.get("title", "Untitled"),
            "timestamp": submission["timestamp"],
            "status": "pending"
        })
        save_queue(queue)

        # Try to run orchestrator (async in production, sync for simplicity here)
        # For now, we just queue the task - manual trigger or background worker can process
        print(f"\n{'='*60}")
        print(f"New {submission_type} submission: {task_id}")
        print(f"Title: {data.get('title', 'Untitled')}")
        print(f"{'='*60}")
        print(task)
        print(f"{'='*60}\n")

        return jsonify({
            "success": True,
            "task_id": task_id,
            "message": f"Submission received and queued for processing"
        })

    except Exception as e:
        print(f"Error processing submission: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/queue", methods=["GET"])
def get_queue():
    """Get all queued tasks."""
    queue = load_queue()
    return jsonify({"tasks": queue})


@app.route("/task/<task_id>", methods=["GET"])
def get_task(task_id):
    """Get details of a specific task."""
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    with open(submission_file) as f:
        submission = json.load(f)

    return jsonify(submission)


@app.route("/process/<task_id>", methods=["POST"])
def process_task(task_id):
    """
    Manually trigger processing of a queued task.

    This runs the orchestrator on the task.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    with open(submission_file) as f:
        submission = json.load(f)

    # Update status to "processing" BEFORE running orchestrator
    submission["status"] = "processing"
    submission["started_at"] = datetime.now().isoformat()
    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status to processing
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = "processing"
            break
    save_queue(queue)

    print(f"\n{'='*60}")
    print(f"Processing task: {task_id}")
    print(f"{'='*60}\n")

    # Run orchestrator
    result = run_orchestrator(submission["formatted_task"], task_id)

    # Update submission with result
    status = result.get("status", "completed")
    submission["status"] = status
    submission["result"] = result

    # Only set processed_at if actually completed (not awaiting clarification)
    if status not in ("awaiting_clarification",):
        submission["processed_at"] = datetime.now().isoformat()

    # Save clarification info if present
    if result.get("needs_clarification"):
        submission["clarification_question"] = result.get("clarification_question")
        submission["clarification_options"] = result.get("clarification_options", [])

    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = status
            break
    save_queue(queue)

    if status == "awaiting_clarification":
        print(f"\n{'='*60}")
        print(f"Task {task_id} needs clarification:")
        print(f"  {result.get('clarification_question')}")
        print(f"{'='*60}\n")
    else:
        print(f"\n{'='*60}")
        print(f"Task {task_id} completed with status: {status}")
        print(f"{'='*60}\n")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "result": result
    })


@app.route("/clarify/<task_id>", methods=["POST"])
def clarify_task(task_id):
    """
    Provide clarification for a task that needs more information.

    Accepts JSON with:
        - answer: The user's clarification answer

    This updates the task with the clarified information and re-runs processing.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    if not data or "answer" not in data:
        return jsonify({"error": "No answer provided"}), 400

    answer = data["answer"]

    with open(submission_file) as f:
        submission = json.load(f)

    # Append clarification to the task
    original_task = submission.get("formatted_task", "")
    clarified_task = f"""{original_task}

---
CLARIFICATION PROVIDED:
{answer}
---
"""

    submission["formatted_task"] = clarified_task
    submission["clarification_answer"] = answer
    submission["clarified_at"] = datetime.now().isoformat()
    submission["status"] = "pending"  # Reset to pending for reprocessing

    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = "pending"
            break
    save_queue(queue)

    write_log(task_id, f"Clarification received: {answer}")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "message": "Clarification received. Ready for reprocessing."
    })


@app.route("/log/<task_id>", methods=["GET"])
def get_log(task_id):
    """Get the processing log for a task."""
    log_file = SUBMISSIONS_DIR / f"{task_id}.log"

    if not log_file.exists():
        return jsonify({"log": "", "exists": False})

    with open(log_file) as f:
        log_content = f.read()

    return jsonify({"log": log_content, "exists": True})


@app.route("/cancel/<task_id>", methods=["POST"])
def cancel_task(task_id):
    """
    Cancel a task and move it to cancelled status.

    Cancelled tasks are kept in history and can be resubmitted.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    with open(submission_file) as f:
        submission = json.load(f)

    # Update status to cancelled
    submission["status"] = "cancelled"
    submission["cancelled_at"] = datetime.now().isoformat()

    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = "cancelled"
            break
    save_queue(queue)

    # Log the cancellation
    write_log(task_id, "Task cancelled by user")

    print(f"Task {task_id} cancelled")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "message": "Task cancelled"
    })


@app.route("/resubmit/<task_id>", methods=["POST"])
def resubmit_task(task_id):
    """
    Resubmit a cancelled or escalated task for retry.

    Instead of creating a new task, this resets the existing task
    and tracks the previous attempt in the history.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    with open(submission_file) as f:
        submission = json.load(f)

    # Initialize attempts history if not present
    if "attempts" not in submission:
        submission["attempts"] = []

    # Save current attempt to history
    attempt = {
        "attempt_number": len(submission["attempts"]) + 1,
        "status": submission.get("status"),
        "started_at": submission.get("started_at"),
        "processed_at": submission.get("processed_at"),
        "cancelled_at": submission.get("cancelled_at"),
        "result": submission.get("result"),
    }
    submission["attempts"].append(attempt)

    # Reset task for new attempt
    submission["status"] = "pending"
    submission["started_at"] = None
    submission["processed_at"] = None
    submission["cancelled_at"] = None
    submission["result"] = None
    submission["resubmitted_at"] = datetime.now().isoformat()

    # Save updated submission
    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = "pending"
            break
    else:
        # Task might have been removed from queue, add it back
        queue.append({
            "task_id": task_id,
            "type": submission["type"],
            "title": submission["data"].get("title", "Untitled"),
            "timestamp": submission["timestamp"],
            "status": "pending"
        })
    save_queue(queue)

    # Clear the log for fresh attempt
    log_file = SUBMISSIONS_DIR / f"{task_id}.log"
    if log_file.exists():
        log_file.unlink()

    attempt_num = len(submission["attempts"]) + 1
    print(f"Task {task_id} resubmitted (attempt #{attempt_num})")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "attempt_number": attempt_num,
        "message": f"Task resubmitted for attempt #{attempt_num}"
    })


@app.route("/archive/<task_id>", methods=["POST"])
def archive_task(task_id):
    """
    Archive a task, removing it from the main queue view.

    Archived tasks can still be viewed in the archive section.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    # Remove from main queue
    queue = load_queue()
    task_data = None
    for i, item in enumerate(queue):
        if item["task_id"] == task_id:
            task_data = queue.pop(i)
            break
    save_queue(queue)

    if not task_data:
        return jsonify({"error": "Task not in queue"}), 404

    # Add to archive
    task_data["archived_at"] = datetime.now().isoformat()
    archive = load_archive()
    archive.append(task_data)
    save_archive(archive)

    # Update submission file
    with open(submission_file) as f:
        submission = json.load(f)
    submission["archived"] = True
    submission["archived_at"] = task_data["archived_at"]
    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    print(f"Task {task_id} archived")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "message": "Task archived"
    })


@app.route("/unarchive/<task_id>", methods=["POST"])
def unarchive_task(task_id):
    """
    Restore an archived task back to the main queue.
    """
    submission_file = SUBMISSIONS_DIR / f"{task_id}.json"

    if not submission_file.exists():
        return jsonify({"error": "Task not found"}), 404

    # Remove from archive
    archive = load_archive()
    task_data = None
    for i, item in enumerate(archive):
        if item["task_id"] == task_id:
            task_data = archive.pop(i)
            break
    save_archive(archive)

    if not task_data:
        return jsonify({"error": "Task not in archive"}), 404

    # Remove archived_at from task data for queue
    task_data.pop("archived_at", None)

    # Add back to main queue
    queue = load_queue()
    queue.append(task_data)
    save_queue(queue)

    # Update submission file
    with open(submission_file) as f:
        submission = json.load(f)
    submission.pop("archived", None)
    submission.pop("archived_at", None)
    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    print(f"Task {task_id} unarchived")

    return jsonify({
        "success": True,
        "task_id": task_id,
        "message": "Task restored from archive"
    })


@app.route("/archived", methods=["GET"])
def get_archived():
    """Get all archived tasks."""
    archive = load_archive()
    return jsonify({"tasks": archive})


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    import os
    api_key_set = bool(os.environ.get("ANTHROPIC_API_KEY"))

    return jsonify({
        "status": "healthy",
        "orchestrator_available": ORCHESTRATOR_AVAILABLE,
        "api_key_set": api_key_set,
        "queued_tasks": len(load_queue())
    })


if __name__ == "__main__":
    print("""
    ====================================
    Space Gerbil Game Creator Portal
    ====================================

    Server starting on http://localhost:5050

    Open the portal at: http://localhost:5050/portal

    API Endpoints:
      POST /submit     - Submit bug/feature
      GET  /queue      - View task queue
      GET  /task/<id>  - Get task details
      POST /process/<id> - Run orchestrator on task
      GET  /health     - Server health check

    Press Ctrl+C to stop the server.
    ====================================
    """)

    # Note: debug=False to prevent auto-reload from killing long-running orchestrator tasks
    app.run(host="0.0.0.0", port=5050, debug=False)
