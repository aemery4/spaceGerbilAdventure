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
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add agents directory to path for imports
AGENTS_DIR = Path(__file__).parent.parent / "agents"
sys.path.insert(0, str(AGENTS_DIR))

# Try to import orchestrator
try:
    from orchestrator.graph import create_graph, OrchestratorState
    ORCHESTRATOR_AVAILABLE = True
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


def run_orchestrator(task: str, task_id: str) -> dict:
    """
    Run the LangGraph orchestrator with the given task.

    Args:
        task: The formatted task description
        task_id: Unique ID for this task

    Returns:
        Result dictionary from the orchestrator
    """
    if not ORCHESTRATOR_AVAILABLE:
        return {
            "status": "queued",
            "message": "Orchestrator not available. Task has been queued for manual processing."
        }

    try:
        # Create and run the graph
        graph = create_graph()

        initial_state = OrchestratorState(
            task=task,
            task_id=task_id,
            messages=[],
            current_agent=None,
            agent_outputs={},
            iteration=0,
            max_iterations=10,
            status="pending"
        )

        # Run the orchestrator
        result = graph.invoke(initial_state)

        return {
            "status": result.get("status", "completed"),
            "agent_outputs": result.get("agent_outputs", {}),
            "iterations": result.get("iteration", 0)
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
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

    # Run orchestrator
    result = run_orchestrator(submission["formatted_task"], task_id)

    # Update submission with result
    submission["status"] = result.get("status", "completed")
    submission["result"] = result
    submission["processed_at"] = datetime.now().isoformat()

    with open(submission_file, "w") as f:
        json.dump(submission, f, indent=2)

    # Update queue status
    queue = load_queue()
    for item in queue:
        if item["task_id"] == task_id:
            item["status"] = result.get("status", "completed")
            break
    save_queue(queue)

    return jsonify({
        "success": True,
        "task_id": task_id,
        "result": result
    })


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "orchestrator_available": ORCHESTRATOR_AVAILABLE,
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

    app.run(host="0.0.0.0", port=5050, debug=True)
