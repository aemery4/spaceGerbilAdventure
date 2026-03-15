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
    graph = create_sga_graph()
    initial_state = create_initial_state(task)

    # Run the graph
    final_state = graph.invoke(initial_state)

    return final_state


# Export the compiled graph for direct use
sga_graph = create_sga_graph()
