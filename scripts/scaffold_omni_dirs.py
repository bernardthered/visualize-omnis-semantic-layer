#!/usr/bin/env python3
"""
Scaffold a directory tree from Omni connections and models.

Usage:
    python scaffold_omni_dirs.py [--output-dir OUTPUT_DIR]

Environment variables:
    OMNI_ORGANIZATION_NAME  Your Omni org name (e.g. "acme" for acme.omniapp.co)
    OMNI_API_KEY            Your Omni API key
"""

import argparse
import json
import os
import sys
from pathlib import Path

import yaml

from omni import OmniApiClient


def sanitize(name: str) -> str:
    """Make a string safe to use as a directory name."""
    return "".join(c if c.isalnum() or c in ("-", "_", ".", " ") else "_" for c in name).strip()


def fetch_connections(client: OmniApiClient) -> list[dict]:
    response = client.get("/v1/connections")
    # Handle both {"connections": [...]} and plain list responses
    if isinstance(response, list):
        return response
    return response.get("connections", response.get("data", []))


def fetch_model_yaml_files(client: OmniApiClient, model_id: str) -> dict[str, str]:
    """Fetch all YAML files for a model, returning a dict of filename → yaml content."""
    response = client.get(f"/v1/models/{model_id}/yaml")
    return response.get("files", {}) if isinstance(response, dict) else {}


def fetch_relationships(client: OmniApiClient, model_id: str) -> str:
    """Fetch just the relationships YAML for a model."""
    response = client.get(f"/v1/models/{model_id}/yaml", params={"fileName": "relationships"})
    files = response.get("files", {}) if isinstance(response, dict) else {}
    return files.get("relationships", "")


def extract_topics(files: dict[str, str]) -> list[dict]:
    """Extract and parse topic definitions from a model's YAML files dict."""
    topics = []
    for key, yaml_str in files.items():
        if not key.endswith(".topic"):
            continue
        try:
            topic_data = yaml.safe_load(yaml_str) or {}
        except yaml.YAMLError:
            topic_data = {}
        topic_data.setdefault("name", key.removesuffix(".topic").split("/")[-1])
        topic_data["_yaml_key"] = key
        topics.append(topic_data)
    return topics


def extract_views(files: dict[str, str]) -> list[dict]:
    """Extract view definitions from a model's YAML files dict."""
    views = []
    for key, yaml_str in files.items():
        if not key.endswith(".view"):
            continue
        view_name = key.removesuffix(".view").split("/")[-1]
        views.append({"name": view_name, "_yaml_key": key, "_yaml": yaml_str})
    return views


def fetch_models(client: OmniApiClient) -> list[dict]:
    response = client.get("/v1/models", params={"include": "activeBranches", "modelKind": "SHARED", "pageSize": 100})
    # print(f"  Raw response: {response}")
    if isinstance(response, list):
        return response
    return response.get("models", response.get("records", []))


def fetch_models_and_connections(client: OmniApiClient) -> tuple[list[dict], dict[str, list[dict]]]:
    print(f"Fetching connections from {client.base_url}…")
    connections = fetch_connections(client)
    if not connections:
        sys.exit("No connections returned. Check your credentials and org name.")
    print(f"  Found {len(connections)} connection(s).")

    print("Fetching models…")
    models = fetch_models(client)
    print(f"  Found {len(models)} model(s).")

    models_by_connection: dict[str, list[dict]] = {}
    for model in models:
        conn_id = model.get("connectionId") or model.get("connection_id") or ""
        models_by_connection.setdefault(conn_id, []).append(model)

    return connections, models_by_connection


def build_directory_tree(
    client: OmniApiClient,
    root: Path,
    connections: list[dict],
    models_by_connection: dict[str, list[dict]],
) -> None:
    root.mkdir(parents=True, exist_ok=True)

    for conn in connections:
        conn_id = conn.get("id", "")
        conn_name = conn.get("name") or conn_id or "unknown"
        conn_dir = root / sanitize(conn_name)
        conn_dir.mkdir(exist_ok=True)
        print(f"\n  [{conn_name}]  →  {conn_dir}/")

        conn_models = models_by_connection.get(conn_id, [])
        if not conn_models:
            print("    (no models)")
            continue

        for model in conn_models:
            model_id = model.get("id", "")
            model_name = model.get("name") or model_id or "unknown"
            model_dir = conn_dir / sanitize(model_name)
            model_dir.mkdir(exist_ok=True)
            (model_dir / "info.json").write_text(json.dumps(model, indent=2))
            print(f"    {model_name}  →  {model_dir}/")

            yaml_files = fetch_model_yaml_files(client, model_id)

            # relationships.yaml
            relationships_yaml = fetch_relationships(client, model_id)
            if relationships_yaml:
                (model_dir / "relationships.yaml").write_text(relationships_yaml)
                print(f"      relationships.yaml")

            # views/
            views = extract_views(yaml_files)
            if views:
                views_dir = model_dir / "views"
                views_dir.mkdir(exist_ok=True)
                for view in views:
                    view_file = views_dir / f"{sanitize(view['name'])}.yaml"
                    view_file.write_text(view["_yaml"])
                print(f"      views/  ({len(views)} view(s))")

            # topics/
            topics = extract_topics(yaml_files)
            if not topics:
                print("      (no topics)")
                continue

            topics_dir = model_dir / "topics"
            topics_dir.mkdir(exist_ok=True)
            for topic in topics:
                topic_name = topic.get("name") or "unknown"
                topic_dir = topics_dir / sanitize(topic_name)
                topic_dir.mkdir(exist_ok=True)
                (topic_dir / "info.json").write_text(json.dumps(topic, indent=2))
                label = topic.get("label") or topic_name
                hidden = " [hidden]" if topic.get("hidden") else ""
                print(f"      topics/{sanitize(topic_name)}/  ({label}{hidden})")


def main():
    parser = argparse.ArgumentParser(description="Scaffold directories for Omni connections and models.")
    parser.add_argument(
        "--output-dir",
        default="omni_data",
        help="Root directory to create (default: ./omni_data)",
    )
    args = parser.parse_args()

    org = os.environ.get("OMNI_ORGANIZATION_NAME")
    key = os.environ.get("OMNI_API_KEY")
    if not org or not key:
        sys.exit("Error: OMNI_ORGANIZATION_NAME and OMNI_API_KEY must be set.")

    client = OmniApiClient(organization_name=org, api_key=key)
    root = Path(args.output_dir, org)

    connections, models_by_connection = fetch_models_and_connections(client)
    build_directory_tree(client, root, connections, models_by_connection)

    print(f"\nDone. Directory tree written to: {root.resolve()}")


if __name__ == "__main__":
    main()
