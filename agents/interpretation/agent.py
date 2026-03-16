"""
Request Interpretation Agent for SGA Multi-Agent System.

This agent transforms vague or casual task descriptions into precise,
well-scoped task definitions that the Content Agent can execute reliably.

Key features:
- Uses Haiku model for cost efficiency
- Pre-loaded knowledge (no per-request file reads)
- Structured JSON output
- Returns clarifying questions when requests are ambiguous
"""

import json
import sys
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from ..state import AgentState


# ═══════════════════════════════════════════════════════════════════════════════
# PRE-LOADED KNOWLEDGE (embedded to avoid API calls for file reads)
# ═══════════════════════════════════════════════════════════════════════════════

CODEBASE_KNOWLEDGE = """
## Space Gerbil Adventure - Codebase Structure

### File Map
| File | Contents | When to modify |
|------|----------|----------------|
| js/globals.js | Save data, lives, gamePaused flag | Rarely |
| js/save.js | persist(), loadSave() | Rarely |
| js/hud.js | updateHUD(), showMsg(), loseLife(), RECIPES | HUD changes, recipes |
| js/craft.js | toggleCraft(), renderCraft() | Crafting changes |
| js/menu.js | Main menu, planet select, transitions | Menu changes, adding planets |
| js/planet1.js | launchP1() — Earth/Area 51 | Planet 1 changes |
| js/planet2.js | launchP2() — Jungle Zorbax | Planet 2 changes |
| js/planet3.js | launchP3() — Tundra Frigia | Planet 3 changes |
| js/planet4.js | launchP4() — Aquatic Neptuna | Planet 4 changes |
| js/skins.js | ALL_SKINS array, wardrobe | Skin changes |
| js/p3-data.js | Planet 3 data/constants | P3 data changes |
| js/p3-draw.js | Planet 3 drawing functions | P3 visuals |
| js/p3-logic.js | Planet 3 game logic | P3 mechanics |

### Planet Details
- Planet 1: Earth/Area 51 — 10 fuel goal, aliens, rocket launch
- Planet 2: Jungle Zorbax — 48×28 map, village merchants, Jungle King boss, 15 fuel
- Planet 3: Tundra Frigia — tigers, mammoths, Yeti boss, camp merchants, 20 fuel
- Planet 4: Aquatic Neptuna — squids, piranhas, Octopus boss, seahorse helpers, 25 fuel

### Global Variables (shared across files)
- save: { hp, maxHp, lives, resources:{rock,plant,crystal,banana,fuel}, items:[], planetsCleared:[], skin }
- gamePaused: boolean
- animFrameId: requestAnimationFrame id
- menuMode: true when on main menu

### Global Functions
- updateHUD() — refresh HUD display
- showMsg(title, body, callback) — modal message
- loseLife(restartFn) — handle death
- persist() — save to localStorage
- goMenu() — return to menu
- stopGame() — cancel animation loop
- drawPlayerSkin(ctx, x, y, size) — draw player

### Architecture Rules
1. Each planet's logic is self-contained in launchPX()
2. Use const/let, never var
3. Declare variables BEFORE loop() function
4. Canvas is always 800×520px
5. New planets need: js file, script tag in index.html, menu button in menu.js
"""

BUG_CATEGORIES = """
## Bug Categories & Common Issues

### Spawn/Timing Issues
- Enemy appears too early/late
- Boss visible at game start (should be triggered)
- Objects spawning outside playable area

### Progression Issues
- Planet locked/unlocked incorrectly
- Fuel count wrong
- Items not saving
- Clearing planet doesn't unlock next

### Visual Issues
- Wrong sprite/emoji displayed
- Animation glitches
- HUD not updating
- Elements overlapping incorrectly

### Collision Issues
- Player passes through walls
- Enemies not detecting player
- Resources not collectible

### Balance Issues
- Too easy/hard
- Enemy damage/speed wrong
- Resource spawn rates off
"""

TASK_TYPES = """
## Task Type Definitions

### bug_fix
A defect in existing functionality. Something that worked or was supposed to work is broken.
Examples: "jungle king shows up too early", "fuel counter resets", "can't collect crystals"

### new_feature
Adding new functionality that doesn't exist yet.
Examples: "add a shop to planet 3", "add controller support", "add sound effects"

### new_enemy
Adding a new enemy type to an existing planet.
Examples: "add spiders to the jungle", "add a mini-boss", "add flying enemies"

### new_planet
Creating an entirely new planet level.
Examples: "add an ice planet", "add planet 5", "add underwater level"

### content_change
Modifying existing content without changing functionality.
Examples: "change alien color", "update boss dialogue", "rename planet 2"

### balance_tweak
Adjusting numbers/difficulty without adding features.
Examples: "make enemies faster", "reduce fuel needed", "increase player health"
"""


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════════

INTERPRETATION_SYSTEM_PROMPT = f"""You are the Request Interpretation Agent for Space Gerbil Adventure.

Your job is to transform vague or casual task descriptions into precise, structured task definitions.

{CODEBASE_KNOWLEDGE}

{BUG_CATEGORIES}

{TASK_TYPES}

## Your Output Format

You MUST respond with a valid JSON object. Choose ONE of these formats:

### Format 1: Structured Task (when request is clear enough)
```json
{{
  "status": "ready",
  "task_type": "bug_fix|new_feature|new_enemy|new_planet|content_change|balance_tweak",
  "title": "Short descriptive title",
  "planet": "planet1|planet2|planet3|planet4|menu|global|multiple",
  "files_to_modify": ["js/planet2.js"],
  "description": "Detailed description of what needs to be done",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "edge_cases": ["Edge case to watch for"],
  "complexity": "simple|medium|complex",
  "estimated_iterations": 1
}}
```

### Format 2: Clarifying Question (when request is ambiguous)
```json
{{
  "status": "needs_clarification",
  "question": "Your specific question to the user",
  "options": ["Option 1", "Option 2", "Option 3"],
  "reason": "Why you need this information"
}}
```

## Guidelines

1. Be SPECIFIC about files - use exact filenames from the file map
2. Acceptance criteria should be testable by the Test Agent
3. If multiple interpretations are possible, ASK rather than guess
4. For "make it harder/easier" type requests, always ask WHAT specifically
5. For new enemies/features without a planet specified, always ask WHERE
6. Keep descriptions concise but complete
7. Complexity guide:
   - simple: Single file, <20 lines changed, 1 iteration
   - medium: 1-2 files, 20-100 lines, 2-3 iterations
   - complex: 3+ files, >100 lines, 4-5 iterations

RESPOND ONLY WITH THE JSON OBJECT. No other text.
"""


def create_interpretation_llm() -> ChatAnthropic:
    """Create the LLM instance for the Interpretation agent using Haiku for cost efficiency."""
    return ChatAnthropic(
        model="claude-3-5-haiku-20241022",  # Haiku for cost efficiency
        temperature=0,
        max_tokens=1024,  # Structured output doesn't need many tokens
    )


def interpretation_node(state: AgentState) -> dict:
    """
    Interpretation node function for the StateGraph.

    Transforms raw task input into structured task definition.

    Args:
        state: Current AgentState with raw task

    Returns:
        Partial state update with interpreted task or clarification needed
    """
    def log(msg):
        print(f"[Interpretation Agent] {msg}", file=sys.stderr)

    raw_task = state.get("task", "")

    if not raw_task:
        return {
            "interpretation_result": {"status": "error", "message": "No task provided"},
            "needs_clarification": True,
            "clarification_question": "What would you like me to help with?",
        }

    log(f"Interpreting: {raw_task[:100]}...")

    llm = create_interpretation_llm()

    messages = [
        SystemMessage(content=INTERPRETATION_SYSTEM_PROMPT),
        HumanMessage(content=f"Interpret this request:\n\n{raw_task}"),
    ]

    try:
        response = llm.invoke(messages)
        response_text = response.content.strip()

        # Clean up response - remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Parse JSON response
        result = json.loads(response_text)

        if result.get("status") == "needs_clarification":
            log(f"Needs clarification: {result.get('question', 'Unknown')}")
            return {
                "interpretation_result": result,
                "needs_clarification": True,
                "clarification_question": result.get("question"),
                "clarification_options": result.get("options", []),
                "status": "awaiting_clarification",
            }

        # Ready to proceed - enhance the task with structured info
        log(f"Interpreted as: {result.get('task_type')} - {result.get('title')}")
        log(f"Files: {', '.join(result.get('files_to_modify', []))}")
        log(f"Complexity: {result.get('complexity')}")

        # Build enhanced task description for Content Agent
        enhanced_task = f"""## Task: {result.get('title')}

Type: {result.get('task_type')}
Planet: {result.get('planet')}
Complexity: {result.get('complexity')}

### Description
{result.get('description')}

### Files to Modify
{chr(10).join('- ' + f for f in result.get('files_to_modify', []))}

### Acceptance Criteria
{chr(10).join('- ' + c for c in result.get('acceptance_criteria', []))}

### Edge Cases
{chr(10).join('- ' + e for e in result.get('edge_cases', []))}
"""

        return {
            "interpretation_result": result,
            "task": enhanced_task,  # Replace raw task with structured version
            "task_type": result.get("task_type", "feature"),
            "target_files": result.get("files_to_modify", []),
            "needs_clarification": False,
            "status": "in_progress",
        }

    except json.JSONDecodeError as e:
        log(f"Failed to parse LLM response as JSON: {e}")
        log(f"Raw response: {response_text[:200]}")
        # Fall back to passing through the original task
        return {
            "interpretation_result": {"status": "error", "message": "Parse error"},
            "needs_clarification": False,
            "status": "in_progress",
        }
    except Exception as e:
        log(f"Interpretation error: {e}")
        return {
            "interpretation_result": {"status": "error", "message": str(e)},
            "needs_clarification": False,
            "status": "in_progress",
        }
