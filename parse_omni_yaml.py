#!/usr/bin/env python3
"""
Parse Omni YAML view and topic files and output a D3-compatible treemap JSON.

Hierarchy: Model → (Topics | Joins | Views)
  - Topics: one node per .topic.yaml, children are base_view + join references
  - Joins:  join relationships grouped by topic
  - Views:  one node per .view.yaml grouped by schema, with dimensions/measures

Usage:
    python parse_omni_yaml.py [--root /path/to/omni] [--output treemap.json]
"""

import argparse
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("PyYAML is required: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


def slugify(name: str) -> str:
    """Convert a name to a safe identifier."""
    return re.sub(r"[^\w]", "_", name).strip("_")


def flatten_joins(joins_dict) -> list[str]:
    """Recursively flatten a nested joins dict into a flat list of view names."""
    result = []
    if not isinstance(joins_dict, dict):
        return result
    for view_name, nested in joins_dict.items():
        result.append(view_name)
        if nested:
            result.extend(flatten_joins(nested))
    return result


def parse_topic_file(path: str) -> dict | None:
    """Parse a *.topic.yaml file and return structured data, or None on error."""
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"  Warning: could not parse {path}: {e}", file=sys.stderr)
            return None

    if not isinstance(data, dict):
        return None

    filename = os.path.basename(path)
    topic_name = filename.replace(".topic.yaml", "")
    base_view = data.get("base_view", topic_name)
    label = data.get("label", topic_name)
    joins_dict = data.get("joins") or {}
    joined_views = flatten_joins(joins_dict)

    return {
        "name": topic_name,
        "label": label,
        "base_view": base_view,
        "joined_views": joined_views,
    }


def parse_view_file(path: str) -> dict | None:
    """Parse a *.view.yaml file and return structured data, or None on error."""
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"  Warning: could not parse {path}: {e}", file=sys.stderr)
            return None

    if not isinstance(data, dict):
        return None

    filename = os.path.basename(path)
    view_name = filename.replace(".view.yaml", "")

    schema = data.get("schema", "UNKNOWN")
    table_name = data.get("table_name", view_name.upper())

    field_groups = []
    for group_key in ("dimensions", "measures"):
        fields_raw = data.get(group_key)
        if not isinstance(fields_raw, dict):
            continue

        field_nodes = []
        for field_name, field_meta in fields_raw.items():
            if not isinstance(field_meta, dict):
                field_meta = {}

            node = {
                "name": field_name,
                "value": 1,
                "field_type": group_key.rstrip("s"),  # "dimension" or "measure"
                "sql": field_meta.get("sql"),
                "aggregate_type": field_meta.get("aggregate_type"),
                "format": field_meta.get("format"),
                "label": field_meta.get("label"),
                "primary_key": field_meta.get("primary_key", False),
            }
            node = {k: v for k, v in node.items() if v is not None and v is not False}
            field_nodes.append(node)

        if field_nodes:
            field_groups.append({
                "name": group_key,
                "children": field_nodes,
            })

    return {
        "name": view_name,
        "schema": schema,
        "table_name": table_name,
        "children": field_groups,
        "field_count": sum(len(g["children"]) for g in field_groups),
    }


def build_treemap(omni_root: str) -> dict:
    """
    Walk the omni directory and build a D3 treemap with three top-level sections:
    topics, joins, and views.
    """
    views_by_schema: dict[str, list[dict]] = {}
    topics: list[dict] = []

    for dirpath, _dirnames, filenames in os.walk(omni_root):
        for filename in sorted(filenames):
            full_path = os.path.join(dirpath, filename)

            if filename.endswith(".view.yaml"):
                view = parse_view_file(full_path)
                if view is None:
                    continue
                views_by_schema.setdefault(view["schema"], []).append(view)

            elif filename.endswith(".topic.yaml"):
                topic = parse_topic_file(full_path)
                if topic is None:
                    continue
                topics.append(topic)

    # ── Topics section ───────────────────────────────────────────────────────
    # Each topic's children: the base_view ref + one ref per joined view
    topic_nodes = []
    for topic in sorted(topics, key=lambda t: t["name"]):
        children = [
            {"name": topic["base_view"], "value": 1, "ref_type": "base_view"},
        ]
        for jv in topic["joined_views"]:
            children.append({"name": jv, "value": 1, "ref_type": "join"})

        topic_nodes.append({
            "name": topic["name"],
            "label": topic["label"],
            "base_view": topic["base_view"],
            "children": children,
        })

    # ── Joins section ────────────────────────────────────────────────────────
    # Only include topics that actually have joins; children are join refs
    join_nodes = []
    for topic in sorted(topics, key=lambda t: t["name"]):
        if not topic["joined_views"]:
            continue
        join_nodes.append({
            "name": topic["name"],
            "label": topic["label"],
            "children": [
                {"name": jv, "value": 1, "ref_type": "join"}
                for jv in topic["joined_views"]
            ],
        })

    # ── Views section ────────────────────────────────────────────────────────
    # Views grouped by schema; each view has dimensions/measures children
    schema_nodes = []
    for schema_name, views in sorted(views_by_schema.items()):
        view_nodes = [
            {
                "name": v["name"],
                "table_name": v["table_name"],
                "children": v["children"],
            }
            for v in sorted(views, key=lambda v: v["name"])
        ]
        schema_nodes.append({"name": schema_name, "children": view_nodes})

    return {
        "name": "omni",
        "children": [
            {"name": "topics", "children": topic_nodes},
            {"name": "joins",  "children": join_nodes},
            {"name": "views",  "children": schema_nodes},
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Parse Omni YAML files into D3 treemap JSON")
    parser.add_argument(
        "--root",
        default=os.path.join(os.path.dirname(__file__), "omni"),
        help="Path to the omni directory (default: ./omni)",
    )
    parser.add_argument(
        "--output",
        default="treemap.json",
        help="Output JSON file path (default: treemap.json)",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="Pretty-print the JSON output (default: true)",
    )
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        print(f"Error: omni root directory not found: {args.root}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning: {args.root}")
    treemap = build_treemap(args.root)

    topics_node = next((c for c in treemap["children"] if c["name"] == "topics"), None)
    joins_node  = next((c for c in treemap["children"] if c["name"] == "joins"),  None)
    views_node  = next((c for c in treemap["children"] if c["name"] == "views"),  None)

    total_topics  = len(topics_node["children"]) if topics_node else 0
    total_schemas = len(views_node["children"])  if views_node  else 0
    total_views   = sum(len(s["children"]) for s in (views_node["children"] if views_node else []))
    total_joins   = sum(len(j["children"]) for j in (joins_node["children"]  if joins_node else []))
    total_fields  = sum(
        len(g["children"])
        for s in (views_node["children"] if views_node else [])
        for v in s["children"]
        for g in v["children"]
    )
    print(
        f"Found {total_topics} topic(s), {total_joins} join(s), "
        f"{total_schemas} schema(s), {total_views} view(s), {total_fields} field(s)"
    )

    indent = 2 if args.pretty else None
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(treemap, f, indent=indent, ensure_ascii=False)
        f.write("\n")

    print(f"Written: {args.output}")


if __name__ == "__main__":
    main()
