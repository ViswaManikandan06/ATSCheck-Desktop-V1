from copy import deepcopy
from typing import Any


def normalize_json_schema(schema: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(schema)

    def visit(node: Any) -> None:
        if not isinstance(node, dict):
            return

        properties = node.get("properties")
        if node.get("type") == "object" or isinstance(properties, dict):
            node["additionalProperties"] = False
            if isinstance(properties, dict):
                node["required"] = list(properties)

        for value in node.values():
            if isinstance(value, dict):
                visit(value)
            elif isinstance(value, list):
                for item in value:
                    visit(item)

    visit(normalized)
    return normalized


def normalize_response_format(schema: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_json_schema(schema)
    return {
        "type": "json_schema",
        "json_schema": {
            "name": schema.get("title", "structured_response"),
            "schema": normalized,
            "strict": True,
        },
    }