from __future__ import annotations

from functools import lru_cache
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.graphs.nodes.common import (
    format_output_node,
    load_payload_node,
    persist_artifacts_node,
    policy_guard_node,
    route_task_condition,
    route_task_node,
)
from app.graphs.nodes.compliance_nodes import (
    compliance_deterministic_node,
    compliance_llm_node,
    compliance_merge_node,
)
from app.graphs.nodes.review_nodes import (
    review_deterministic_node,
    review_llm_node,
    review_merge_node,
)
from app.graphs.nodes.screening_nodes import (
    screening_deterministic_node,
    screening_llm_node,
    screening_merge_node,
)


GraphState = dict[str, Any]


@lru_cache(maxsize=1)
def get_orchestrator_graph():
    graph = StateGraph(GraphState)

    graph.add_node("load_payload", load_payload_node)
    graph.add_node("route_task", route_task_node)

    graph.add_node("screening_deterministic", screening_deterministic_node)
    graph.add_node("screening_llm", screening_llm_node)
    graph.add_node("screening_merge", screening_merge_node)

    graph.add_node("review_deterministic", review_deterministic_node)
    graph.add_node("review_llm", review_llm_node)
    graph.add_node("review_merge", review_merge_node)

    graph.add_node("compliance_deterministic", compliance_deterministic_node)
    graph.add_node("compliance_llm", compliance_llm_node)
    graph.add_node("compliance_merge", compliance_merge_node)

    graph.add_node("policy_guard", policy_guard_node)
    graph.add_node("format_output", format_output_node)
    graph.add_node("persist_artifacts", persist_artifacts_node)

    graph.add_edge(START, "load_payload")
    graph.add_edge("load_payload", "route_task")
    graph.add_conditional_edges(
        "route_task",
        route_task_condition,
        {
            "screening": "screening_deterministic",
            "review_package": "review_deterministic",
            "compliance": "compliance_deterministic",
        },
    )

    graph.add_edge("screening_deterministic", "screening_llm")
    graph.add_edge("screening_llm", "screening_merge")
    graph.add_edge("screening_merge", "policy_guard")

    graph.add_edge("review_deterministic", "review_llm")
    graph.add_edge("review_llm", "review_merge")
    graph.add_edge("review_merge", "policy_guard")

    graph.add_edge("compliance_deterministic", "compliance_llm")
    graph.add_edge("compliance_llm", "compliance_merge")
    graph.add_edge("compliance_merge", "policy_guard")

    graph.add_edge("policy_guard", "format_output")
    graph.add_edge("format_output", "persist_artifacts")
    graph.add_edge("persist_artifacts", END)

    return graph.compile()
