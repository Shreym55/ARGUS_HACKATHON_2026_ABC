from __future__ import annotations

from functools import lru_cache
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.graphs.intake_nodes import (
    application_node,
    greeting_node,
    intake_route_condition,
    intent_node,
    out_of_scope_node,
    qna_node,
)

GraphState = dict[str, Any]


@lru_cache(maxsize=1)
def get_intake_graph():
    graph = StateGraph(GraphState)

    graph.add_node("intent", intent_node)
    graph.add_node("greeting", greeting_node)
    graph.add_node("out_of_scope", out_of_scope_node)
    graph.add_node("qna", qna_node)
    graph.add_node("application", application_node)

    graph.add_edge(START, "intent")
    graph.add_conditional_edges(
        "intent",
        intake_route_condition,
        {
            "greeting": "greeting",
            "out_of_scope": "out_of_scope",
            "qna": "qna",
            "application": "application",
        },
    )
    graph.add_edge("greeting", END)
    graph.add_edge("out_of_scope", END)
    graph.add_edge("qna", END)
    graph.add_edge("application", END)

    return graph.compile()
