"""
SGA Multi-Agent Orchestration System - Entry Point

This is the main entry point for running the Space Gerbil Adventure
multi-agent system. It provides both CLI and programmatic interfaces.

Usage:
    python main.py "Add a new enemy type to Planet 1"
    python main.py --validate  # Run validation only
    python main.py --interactive  # Interactive mode
"""

import argparse
import sys
import io

# Fix Windows console encoding for Unicode
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from agents.graph import run_task, sga_graph
from agents.state import create_initial_state
from agents.test.agent import run_quick_validation


def main():
    parser = argparse.ArgumentParser(
        description="SGA Multi-Agent Orchestration System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python main.py "Fix the bug where gerbil falls through floor"
    python main.py "Add a new powerup that gives double jump"
    python main.py --validate
        """,
    )

    parser.add_argument(
        "task",
        nargs="?",
        help="Task description to process",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Run validation only (no agent processing)",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run in interactive mode",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose output",
    )

    args = parser.parse_args()

    # Validation-only mode
    if args.validate:
        print("Running validation...")
        result = run_quick_validation()
        _print_validation_result(result)
        sys.exit(0 if result.get("passed") else 1)

    # Interactive mode
    if args.interactive:
        _run_interactive(args.verbose)
        return

    # Task processing mode
    if not args.task:
        parser.print_help()
        sys.exit(1)

    print(f"Processing task: {args.task}\n")
    result = run_task(args.task)
    _print_result(result, args.verbose)


def _print_validation_result(result: dict):
    """Print validation results in a readable format."""
    if result.get("passed"):
        print("\n✅ All validation checks passed!")
    else:
        print("\n❌ Validation failed:")
        for error in result.get("errors", []):
            print(f"  • {error}")

    if result.get("warnings"):
        print("\n⚠️ Warnings:")
        for warning in result.get("warnings", []):
            print(f"  • {warning}")

    if result.get("suggestions") and not result.get("passed"):
        print("\n💡 Suggestions:")
        for suggestion in result.get("suggestions", []):
            print(f"  • {suggestion}")


def _print_result(result: dict, verbose: bool = False):
    """Print the final workflow result."""
    print("=" * 50)
    print("WORKFLOW RESULT")
    print("=" * 50)

    print(f"Status: {result.get('status', 'unknown')}")
    print(f"Task Type: {result.get('task_type', 'not classified')}")

    if result.get("needs_escalation"):
        print(f"\n⚠️ ESCALATION REQUIRED")
        print(f"Reason: {result.get('escalation_reason')}")
        print("\nResolution options:")
        for i, option in enumerate(result.get("escalation_options", []), 1):
            print(f"  {i}. {option}")

    if result.get("test_result"):
        test = result["test_result"]
        status = "✅ PASSED" if test.get("passed") else "❌ FAILED"
        print(f"\nTest Result: {status}")
        if not test.get("passed") and test.get("errors"):
            print("Errors:")
            for error in test["errors"][:5]:  # Show first 5
                print(f"  • {error}")

    print(f"\nIterations: Content={result.get('content_iterations', 0)}, "
          f"Test={result.get('test_iterations', 0)}, "
          f"Doc={result.get('doc_iterations', 0)}")

    if verbose and result.get("files_modified"):
        print(f"\nFiles Modified: {', '.join(result['files_modified'])}")


def _run_interactive(verbose: bool = False):
    """Run in interactive mode."""
    print("SGA Multi-Agent System - Interactive Mode")
    print("Type 'quit' to exit, 'validate' to run validation\n")

    while True:
        try:
            task = input("Enter task> ").strip()

            if not task:
                continue

            if task.lower() in ("quit", "exit", "q"):
                print("Goodbye!")
                break

            if task.lower() == "validate":
                result = run_quick_validation()
                _print_validation_result(result)
                continue

            print(f"\nProcessing: {task}\n")
            result = run_task(task)
            _print_result(result, verbose)
            print()

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
