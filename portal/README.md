# Space Gerbil Game Creator Portal

A kid-friendly web interface for submitting bug reports and feature requests to the Space Gerbil Adventure development pipeline.

## Quick Start (Windows)

Double-click `start_portal.bat` - it will:
1. Install Flask if needed
2. Start the server on http://localhost:5050
3. Open the portal in your browser

## Manual Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
python portal_server.py
```

Then open http://localhost:5050/portal in your browser.

## How It Works

1. Kids fill out the bug report or feature request form
2. The portal server receives the submission
3. Submissions are saved to `submissions/` folder as JSON
4. Tasks are queued for the LangGraph orchestrator
5. When processed, agents investigate/implement the request

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/portal` | GET | The submission form UI |
| `/submit` | POST | Submit a bug/feature |
| `/queue` | GET | View all queued tasks |
| `/task/<id>` | GET | Get task details |
| `/process/<id>` | POST | Trigger orchestrator |
| `/health` | GET | Server health check |

## Submission Format

### Bug Report
```json
{
  "type": "bug",
  "planet": "planet2",
  "title": "Gerbil stuck in wall",
  "details": "When I walk into the corner...",
  "submitter": "Alex"
}
```

### Feature Request
```json
{
  "type": "feature",
  "category": "new_item",
  "title": "Add a jetpack",
  "details": "The gerbil should be able to fly...",
  "submitter": "Jordan"
}
```

## Files

- `game_creator.html` - The kid-friendly submission form
- `portal_server.py` - Flask server handling submissions
- `start_portal.bat` - Windows startup script
- `requirements.txt` - Python dependencies
- `submissions/` - Saved submissions (gitignored)
