# Visualize Omni's Semantic Layer

An interactive D3 treemap for exploring an [Omni](https://omni.co) model's semantic layer — topics, joins, views, and fields.

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

### 2. Serve and open

```bash
python3 -m http.server 8766
open http://localhost:8766/treemap.html
```
