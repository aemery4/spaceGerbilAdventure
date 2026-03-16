"""
Main LangGraph StateGraph for SGA Multi-Agent Orchestration.

This module constructs the workflow graph that coordinates all agents:
- Orchestrator: Central coordinator and task router
- Content: Reads/writes game code
- Test: Validates changes via validate.js
- Documentation: Maintains CHANGELOG.md

The graph supports:
- Sequential flow: Orchestrator -> Content -> Test -> Documentation -> Complete
- Human escalation after max iterations
"""

from langgraph.graph import StateGraph, START, END

from .state import AgentState, create_initial_state
from .orchestrator import orchestrator_node, route_after_orchestrator
from .test import validation_node
from .content import content_node
from .documentation import documentation_node


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

    # Documentation goes to end
    graph.add_edge("documentation", END)

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
def run_task(task: str) -> dict:
    """
    Run a task through the SGA agent system.

    Args:
        task: Task description from human user

    Returns:
        Final state after workflow completion
    """
    import sys

    print(f"[LangGraph] Starting task: {task[:100]}...", file=sys.stderr)

    graph = create_sga_graph()
    initial_state = create_initial_state(task)

    print(f"[LangGraph] Initial state - status: {initial_state['status']}, agent: {initial_state['current_agent']}", file=sys.stderr)

    # Run the graph with streaming to see each step
    final_state = None
    for step_num, state in enumerate(graph.stream(initial_state)):
        node_name = list(state.keys())[0] if state else "unknown"
        node_state = state.get(node_name, {})
        status = node_state.get('status', 'N/A')
        agent = node_state.get('current_agent', 'N/A')
        iterations = node_state.get('content_iterations', 0)
        print(f"[LangGraph] Step {step_num}: node={node_name}, status={status}, agent={agent}, iterations={iterations}", file=sys.stderr)
        final_state = node_state

    print(f"[LangGraph] Final state - status: {final_state.get('status')}, agent: {final_state.get('current_agent')}", file=sys.stderr)

    return final_state


# Export the compiled graph for direct use
sga_graph = create_sga_graph()
