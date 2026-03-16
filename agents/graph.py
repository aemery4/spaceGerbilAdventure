"""
Main LangGraph StateGraph for SGA Multi-Agent Orchestration.

This module constructs the workflow graph that coordinates all agents:
- Orchestrator: Central coordinator and task router
- Content: Reads/writes game code
- Test: Validates changes via validate.js
- Documentation: Maintains CHANGELOG.md
- Deploy: Git commit and push to remote

The graph supports:
- Sequential flow: Orchestrator -> Content -> Test -> Documentation -> Deploy -> Complete
- Human escalation after max iterations
"""

from langgraph.graph import StateGraph, START, END

from .state import AgentState, create_initial_state
from .orchestrator import orchestrator_node, route_after_orchestrator
from .test import validation_node
from .content import content_node
from .documentation import documentation_node
from .deploy import deploy_node


def create_sga_graph() -> StateGraph:
    """
    Create and compile the SGA multi-agent workflow graph.

    Graph structure:

        START
          │
          ▼
    ┌─────────────┐
    │ Orchestrator│◄──────────────────────────┐
    └─────────────┘                           │
          │                                   │
          │ (route based on status)           │
          ▼                                   │
    ┌─────────────┐     ┌───────────┐    ┌────┴────────┐
    │   Content   │────►│   Test    │───►│ Orchestrator│
    └─────────────┘     └───────────┘    └─────────────┘
                                               │
                               (if tests pass) │
                                               ▼
                                    ┌──────────────────┐
                                    │  Documentation   │
                                    └──────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │     Deploy       │
                                    └──────────────────┘
                                               │
                                               ▼
                                              END

    Returns:
        Compiled StateGraph ready for execution
    """
    # Create the graph with our state schema
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("content", content_node)
    graph.add_node("test", validation_node)
    graph.add_node("documentation", documentation_node)
    graph.add_node("deploy", deploy_node)
    graph.add_node("human", _human_escalation_node)

    # Add edges
    # Start always goes to orchestrator
    graph.add_edge(START, "orchestrator")

    # Orchestrator routes conditionally
    graph.add_conditional_edges(
        "orchestrator",
        route_after_orchestrator,
        {
            "content": "content",
            "documentation": "documentation",
            "human": "human",
            "__end__": END,
        },
    )

    # Content goes to test
    graph.add_edge("content", "test")

    # Test returns to orchestrator for evaluation
    graph.add_edge("test", "orchestrator")

    # Documentation goes to deploy
    graph.add_edge("documentation", "deploy")

    # Deploy goes to end
    graph.add_edge("deploy", END)

    # Human escalation ends the graph
    graph.add_edge("human", END)

    return graph.compile()


def _human_escalation_node(state: AgentState) -> dict:
    """
    Human escalation node.

    This node prepares the state for human review. In a real system,
    this would trigger a notification or pause for human input.
    """
    return {
        "current_agent": "human",
        "status": "escalated",
    }


# Convenience function to run the graph
def run_task(task: str, log_callback=None) -> dict:
    """
    Run a task through the SGA agent system.

    Args:
        task: Task description from human user
        log_callback: Optional function to call with log messages

    Returns:
        Final state after workflow completion
    """
    import sys
    from datetime import datetime

    def log(msg):
        ts = datetime.now().strftime("%H:%M:%S")
        full_msg = f"[{ts}] {msg}"
        print(f"[LangGraph] {full_msg}", file=sys.stderr)
        if log_callback:
            log_callback(msg)

    log(f"Starting workflow...")

    graph = create_sga_graph()
    initial_state = create_initial_state(task)

    log(f"Task classified, routing to content agent")

    # Run the graph with streaming to see each step
    final_state = None
    for step_num, state in enumerate(graph.stream(initial_state)):
        node_name = list(state.keys())[0] if state else "unknown"
        node_state = state.get(node_name, {})
        status = node_state.get('status', 'N/A')
        iterations = node_state.get('content_iterations', 0)
        files_modified = node_state.get('files_modified', [])

        # More descriptive logging
        if node_name == "content":
            if files_modified:
                log(f"Content agent (iteration {iterations}) modified: {', '.join(files_modified)}")
            else:
                log(f"Content agent (iteration {iterations}) analyzing...")
        elif node_name == "test":
            test_result = node_state.get('test_result', {})
            passed = test_result.get('passed', 'unknown')
            log(f"Test agent: {'PASSED' if passed else 'FAILED'}")
        elif node_name == "orchestrator":
            log(f"Orchestrator evaluating (status: {status})")
        elif node_name == "documentation":
            log(f"Documentation agent updating changelog")
        elif node_name == "deploy":
            deploy_result = node_state.get('deploy_result', 'unknown')
            log(f"Deploy agent: {deploy_result}")
        elif node_name == "human":
            log(f"Escalating to human review")

        final_state = node_state

    final_status = final_state.get('status', 'unknown') if final_state else 'unknown'
    log(f"Workflow complete - final status: {final_status}")

    return final_state


# Export the compiled graph for direct use
sga_graph = create_sga_graph()
