# Overview
This repo currently holds two separate but connected projects:

 1. A portal for embedding Omni that could lend ideas for improvements to Gleam
 1. An experiment in visualizing Omni's semantic layer. This is served from the above portal.

 The two will likely be separated in the future if either move forward.

# Gleam Prime PoC

This includes some niceties over Gleam - rebrandability, non-Omni content, collapsible side bar nav, better UX on login page.

# Visualize Omni's Semantic Layer

Interactive D3 visualizations for exploring an [Omni](https://omni.co) model's semantic layer — topics, joins, views, and fields.

## Structure

The treemap has three top-level sections:

- **Topics** — each `.topic.yaml` file, showing its base view and joined views as tiles
- **Joins** — join relationships grouped by topic
- **Views** — all `.view.yaml` files grouped by schema, with dimensions and measures

## Drill-down navigation

- Click a **view** → see its dimensions and measures groups
- Click a **dimensions/measures group** → see individual fields
- Click a **base view or join ref** inside a topic → jump directly to that view's fields
- Use the **breadcrumb** to navigate back up

## Usage

### 1. Parse your Omni YAML files

```bash
pip install pyyaml
python parse_omni_yaml.py --root /path/to/omni --output treemap.json
```

### 2. Run the server to serve them

From the app directory:
```npm run vite```