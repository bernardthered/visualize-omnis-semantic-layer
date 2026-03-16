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
import os
import sys
from pathlib import Path

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


def build_directory_tree(root: Path, connections: list[dict], models_by_connection: dict[str, list[dict]]) -> None:
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
            model_name = model.get("name") or model.get("id") or "unknown"
            model_dir = conn_dir / sanitize(model_name)
            model_dir.mkdir(exist_ok=True)
            # output an info.json with the model metadata
            (model_dir / "info.json").write_text(str(model))
            print(f"    {model_name}  →  {model_dir}/")


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
    build_directory_tree(root, connections, models_by_connection)

    print(f"\nDone. Directory tree written to: {root.resolve()}")


if __name__ == "__main__":
    main()
