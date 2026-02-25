import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './CollapsibleTreePage.css'

const DIM_COLOR       = '#1d4ed8'
const MEAS_COLOR      = '#047857'
const TOPIC_COLOR     = '#7c3aed'
const JOIN_COLOR      = '#d97706'
const BASE_VIEW_COLOR = '#0e7490'
const JOIN_REF_COLOR  = '#5b21b6'
const SCHEMA_COLORS   = d3.schemeTableau10

const DX       = 20
const DY       = 230
const MARGIN_L = 60
const MARGIN_T = DX * 2
const DURATION = 300

export default function CollapsibleTreePage() {
  const chartRef    = useRef(null)
  const svgRef      = useRef(null)
  const gRef        = useRef(null)
  const tooltipRef  = useRef(null)
  const statsRef    = useRef(null)
  const legendRef   = useRef(null)

  // Mutable D3 state accessible from button handlers
  const rootRef        = useRef(null)
  const updateFnRef    = useRef(null)
  const topicsNodeRef  = useRef(null)

  useEffect(() => {
    const chartEl   = chartRef.current
    const tooltipEl = tooltipRef.current
    if (!chartEl) return

    fetch('/treemap.json')
      .then(r => r.json())
      .then(rawData => {

        // ── Annotate ──────────────────────────────────────
        function annotate(node, depth, cat, schema) {
          if (depth === 1) { node._category = node.name; cat = node.name }
          else               node._category = cat
          if (cat === 'views') {
            if (depth === 2)    { node._schema = node.name; schema = node.name }
            else if (depth > 2)   node._schema = schema
          }
          ;(node.children || []).forEach(c => annotate(c, depth + 1, cat, schema))
        }
        annotate(rawData, 0, null, null)

        // ── Color helpers ─────────────────────────────────
        const viewsNode   = rawData.children.find(c => c.name === 'views')
        const schemas     = viewsNode ? viewsNode.children.map(d => d.name) : []
        const schemaColor = d3.scaleOrdinal(schemas, SCHEMA_COLORS)

        function nodeColor(d) {
          const dt = d.data || d
          if (!dt) return '#475569'
          if (dt.ref_type === 'base_view')   return BASE_VIEW_COLOR
          if (dt.ref_type === 'join')        return JOIN_REF_COLOR
          if (dt.field_type === 'dimension') return DIM_COLOR
          if (dt.field_type === 'measure')   return MEAS_COLOR
          if (dt.name === 'dimensions')      return DIM_COLOR
          if (dt.name === 'measures')        return MEAS_COLOR
          const cat = dt._category
          if (cat === 'topics') {
            const depth = d.depth !== undefined ? d.depth : 0
            return d3.color(TOPIC_COLOR).darker([0,0,0.3,0.7,1.1][Math.min(depth,4)]).formatHex()
          }
          if (cat === 'joins') {
            const depth = d.depth !== undefined ? d.depth : 0
            return d3.color(JOIN_COLOR).darker([0,0,0.3,0.6][Math.min(depth,3)]).formatHex()
          }
          const base = d3.color(schemaColor(dt._schema || dt.name))
          if (!base) return '#334155'
          const depth = d.depth !== undefined ? d.depth : 0
          return base.darker([0,0,0.2,0.5,0.9,1.3][Math.min(depth,5)]).formatHex()
        }

        // ── Enrich topic/join refs with view field data ───
        const viewByName = new Map()
        if (viewsNode) {
          viewsNode.children.forEach(schema =>
            (schema.children || []).forEach(view => viewByName.set(view.name, view))
          )
        }
        function findViewData(name) {
          if (viewByName.has(name)) return viewByName.get(name)
          const idx = name.indexOf('__')
          if (idx !== -1) {
            const bare = name.slice(idx + 2)
            if (viewByName.has(bare)) return viewByName.get(bare)
          }
          return null
        }
        function deepClone(obj) { return JSON.parse(JSON.stringify(obj)) }
        function enrichRefs(sectionNode) {
          function enrichTopicRefs(topicNode) {
            ;(topicNode.children || []).forEach(ref => {
              if (!ref.children) {
                const vd = findViewData(ref.name)
                if (vd?.children?.length) {
                  ref.children = deepClone(vd.children)
                  ref.children.forEach(g => {
                    g._category = 'views'; g._schema = vd._schema || vd.name
                    ;(g.children || []).forEach(f => { f._category = 'views'; f._schema = vd._schema || vd.name })
                  })
                }
              }
            })
          }
          ;(sectionNode.children || []).forEach(child => {
            if (child._group) {
              ;(child.children || []).forEach(enrichTopicRefs)
            } else {
              enrichTopicRefs(child)
            }
          })
        }

        const topicsNode = rawData.children.find(c => c.name === 'topics')
        const joinsNode  = rawData.children.find(c => c.name === 'joins')
        if (topicsNode) enrichRefs(topicsNode)
        if (joinsNode)  enrichRefs(joinsNode)
        annotate(rawData, 0, null, null)

        topicsNodeRef.current = topicsNode

        // ── Build hierarchy ───────────────────────────────
        const root = d3.hierarchy(rawData)
        let uid = 0
        root.descendants().forEach(d => { d.id = ++uid; d.x0 = 0; d.y0 = 0 })
        root.descendants().forEach(d => {
          if (d.depth >= 2 && d.children) { d._children = d.children; d.children = null }
        })
        rootRef.current = root

        // ── Layout + SVG ──────────────────────────────────
        const treeLayout = d3.tree().nodeSize([DX, DY])
        const diagonal   = d3.linkHorizontal().x(d => d.y).y(d => d.x)
        const svg = d3.select(svgRef.current)
        const g   = d3.select(gRef.current)

        // ── Node styling ──────────────────────────────────
        function circleFill(d) {
          if (d._children) return nodeColor(d)
          if (d.children)  return '#1a2233'
          return '#334155'
        }
        function circleStroke(d) {
          if (d.depth === 0) return '#64748b'
          return d3.color(nodeColor(d)).brighter(0.5).formatHex()
        }
        function circleR(d) {
          if (d.depth === 0) return 6
          if (d.depth === 1) return 5
          if (d._children || d.children) return 4
          return 3
        }
        function labelText(d) {
          const raw  = d.data.label || d.data.name || ''
          const name = raw.length > 38 ? raw.slice(0, 37) + '…' : raw
          if (d._children) return `${name}  +${d._children.length}`
          return name
        }
        function labelFill(d) {
          if (d.depth === 0 || d.depth === 1) return '#f1f5f9'
          if (d._children) return '#e2e8f0'
          return '#94a3b8'
        }
        function labelWeight(d) { return d.depth <= 1 ? '600' : '400' }
        function labelSize(d)   { return d.depth <= 1 ? '13px' : '12px' }

        // ── Update function ───────────────────────────────
        function update(source) {
          treeLayout(root)
          const nodes = root.descendants()
          const links = root.links()

          let xMin = Infinity, xMax = -Infinity, yMax = -Infinity
          nodes.forEach(d => {
            if (d.x < xMin) xMin = d.x
            if (d.x > xMax) xMax = d.x
            if (d.y > yMax) yMax = d.y
          })
          const svgH = xMax - xMin + MARGIN_T * 2
          const svgW = yMax + DY + MARGIN_L

          svg.transition().duration(DURATION)
            .attr('width', svgW).attr('height', svgH)
            .attr('viewBox', [-MARGIN_L, xMin - MARGIN_T, svgW, svgH])

          // Links
          const link = g.selectAll('path.tree-link').data(links, d => d.target.id)
          const linkEnter = link.enter().insert('path', 'g.tree-node')
            .attr('class', 'tree-link')
            .attr('d', () => { const o = { x: source.x0, y: source.y0 }; return diagonal({ source: o, target: o }) })
          linkEnter.merge(link).transition().duration(DURATION)
            .attr('d', diagonal)
            .attr('stroke', d => { const c = d3.color(nodeColor(d.target)); return c ? c.formatHex() : '#334155' })
          link.exit().transition().duration(DURATION)
            .attr('d', () => { const o = { x: source.x, y: source.y }; return diagonal({ source: o, target: o }) })
            .remove()

          // Nodes
          const node = g.selectAll('g.tree-node').data(nodes, d => d.id)
          const nodeEnter = node.enter().append('g')
            .attr('class', 'tree-node')
            .attr('transform', `translate(${source.y0},${source.x0})`)
            .attr('fill-opacity', 0).attr('stroke-opacity', 0)
          nodeEnter.append('circle')
          nodeEnter.append('text').attr('class', 'label-bg')
          nodeEnter.append('text').attr('class', 'label-fg')

          const nodeMerge = nodeEnter.merge(node)
          nodeMerge.classed('tree-node--leaf', d => !d.children && !d._children)
          nodeMerge.select('circle')
            .attr('r', circleR).attr('fill', circleFill).attr('stroke', circleStroke)
          nodeMerge.select('text.label-bg')
            .attr('x', d => circleR(d) + 6).attr('fill', 'none')
            .attr('stroke', '#0f1117').attr('stroke-width', 3).attr('stroke-linejoin', 'round')
            .attr('font-weight', labelWeight).attr('font-size', labelSize).text(labelText)
          nodeMerge.select('text.label-fg')
            .attr('x', d => circleR(d) + 6).attr('fill', labelFill)
            .attr('font-weight', labelWeight).attr('font-size', labelSize).text(labelText)

          nodeMerge
            .on('click', (event, d) => {
              if (!d.children && !d._children) return
              if (d.children) { d._children = d.children; d.children = null }
              else             { d.children = d._children; d._children = null }
              update(d)
            })
            .on('mousemove', (event, d) => showTooltip(event, d))
            .on('mouseleave', hideTooltip)

          nodeMerge.transition().duration(DURATION)
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .attr('fill-opacity', 1).attr('stroke-opacity', 1)
          node.exit().transition().duration(DURATION)
            .attr('transform', `translate(${source.y},${source.x})`)
            .attr('fill-opacity', 0).attr('stroke-opacity', 0).remove()

          nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y })
          updateStats(nodes)
        }

        updateFnRef.current = update

        // ── Tooltip ───────────────────────────────────────
        function formatFilters(filters) {
          if (!filters || typeof filters !== 'object') return ''
          return Object.entries(filters).map(([field, cond]) => {
            if (cond && typeof cond === 'object') {
              const parts = Object.entries(cond).map(([op, val]) => {
                const valStr = Array.isArray(val) ? '[' + val.join(', ') + ']' : String(val)
                return `${op}: ${valStr}`
              })
              return `${field} → ${parts.join(', ')}`
            }
            return `${field}: ${String(cond)}`
          }).join('\n')
        }

        function showTooltip(event, d) {
          const dt = d.data
          const rows = []
          if (d.depth > 1 && dt._category) rows.push(`<div class="tt-row"><b>Section:</b> ${dt._category}</div>`)
          if (dt.ref_type === 'base_view')  rows.push(`<div class="tt-row"><b>Role:</b> base view ref</div>`)
          else if (dt.ref_type === 'join')  rows.push(`<div class="tt-row"><b>Role:</b> join ref</div>`)
          if (dt.base_view && !dt.ref_type) rows.push(`<div class="tt-row"><b>Base view:</b> ${dt.base_view}</div>`)
          if (dt.table_name) rows.push(`<div class="tt-row"><b>Table:</b> ${dt.table_name}</div>`)
          if (dt._schema)    rows.push(`<div class="tt-row"><b>Schema:</b> ${dt._schema}</div>`)
          if (dt.field_type) rows.push(`<div class="tt-row"><b>Type:</b> ${dt.field_type}</div>`)
          if (dt.aggregate_type) rows.push(`<div class="tt-row"><b>Aggregate:</b> ${dt.aggregate_type}</div>`)
          if (dt.sql)        rows.push(`<div class="tt-row"><b>SQL:</b> <code>${dt.sql}</code></div>`)
          // Topic metadata
          if (dt.description) rows.push(`<div class="tt-row"><b>Description:</b> ${dt.description}</div>`)
          if (dt.display_order !== undefined && dt.display_order !== null)
            rows.push(`<div class="tt-row"><b>Display order:</b> ${dt.display_order}</div>`)
          if (dt.default_filters)
            rows.push(`<div class="tt-row"><b>Default filters:</b><br><code style="white-space:pre">${formatFilters(dt.default_filters)}</code></div>`)
          if (dt.ai_context_chars)
            rows.push(`<div class="tt-row"><b>AI context:</b> ${dt.ai_context_chars} chars</div>`)
          if (dt.sample_queries_chars)
            rows.push(`<div class="tt-row"><b>Sample queries:</b> ${dt.sample_queries_chars} chars</div>`)
          const hidden = d._children?.length || 0
          if (hidden) rows.push(`<div class="tt-row"><b>Hidden children:</b> ${hidden}</div>`)
          tooltipEl.innerHTML = `<div class="tt-title">${dt.label || dt.name}</div>${rows.join('')}`
          tooltipEl.classList.add('visible')
          let tx = event.clientX + 14, ty = event.clientY + 14
          tooltipEl.style.left = '0px'; tooltipEl.style.top = '0px'
          requestAnimationFrame(() => {
            const tw = tooltipEl.offsetWidth, th = tooltipEl.offsetHeight
            if (tx + tw > window.innerWidth)  tx = event.clientX - tw - 14
            if (ty + th > window.innerHeight) ty = event.clientY - th - 14
            tooltipEl.style.left = tx + 'px'; tooltipEl.style.top = ty + 'px'
          })
        }
        function hideTooltip() { tooltipEl.classList.remove('visible') }

        // ── Stats ─────────────────────────────────────────
        function updateStats(nodes) {
          const visible  = nodes.length
          const expanded = nodes.filter(d => d.children).length
          const collapsed = nodes.filter(d => d._children).length
          statsRef.current.innerHTML =
            `<span><b>${visible}</b> visible</span>` +
            `<span><b>${expanded}</b> expanded</span>` +
            `<span><b>${collapsed}</b> collapsed</span>`
        }

        // ── Legend ────────────────────────────────────────
        function buildLegend() {
          const schemaItems = schemas.map(s =>
            `<div class="legend-item"><div class="legend-dot" style="background:${schemaColor(s)}"></div><span>${s}</span></div>`
          ).join('')
          legendRef.current.innerHTML =
            `<div class="legend-item"><div class="legend-dot" style="background:${TOPIC_COLOR}"></div><span>topics</span></div>` +
            `<div class="legend-item"><div class="legend-dot" style="background:${JOIN_COLOR}"></div><span>joins</span></div>` +
            `<span class="tree-sep">|</span>` + schemaItems + `<span class="tree-sep">|</span>` +
            `<div class="legend-item"><div class="legend-dot" style="background:${BASE_VIEW_COLOR}"></div><span>base view</span></div>` +
            `<div class="legend-item"><div class="legend-dot" style="background:${JOIN_REF_COLOR}"></div><span>join ref</span></div>` +
            `<div class="legend-item"><div class="legend-dot" style="background:${DIM_COLOR}"></div><span>dimensions</span></div>` +
            `<div class="legend-item"><div class="legend-dot" style="background:${MEAS_COLOR}"></div><span>measures</span></div>` +
            `<span class="tree-hint">Click node to expand / collapse · Solid = collapsed, ring = expanded</span>`
        }

        buildLegend()
        root.x0 = 0; root.y0 = 0
        update(root)
      })
      .catch(err => {
        chartRef.current.innerHTML = `<p style="padding:20px;color:#f87171">Failed to load treemap.json: ${err.message}</p>`
      })

    return () => {
      if (gRef.current) d3.select(gRef.current).selectAll('*').remove()
    }
  }, [])

  // ── Button handlers (access D3 state via refs) ────────
  function handleReset() {
    const root   = rootRef.current
    const update = updateFnRef.current
    if (!root || !update) return
    root.descendants().forEach(d => {
      if (d.depth < 2) {
        if (!d.children && d._children) { d.children = d._children; d._children = null }
      } else {
        if (d.children) { d._children = d.children; d.children = null }
      }
    })
    update(root)
    setTimeout(() => chartRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' }), DURATION)
  }

  function handleExpandTopics() {
    const root       = rootRef.current
    const update     = updateFnRef.current
    const topicsNode = topicsNodeRef.current
    if (!root || !update) return
    if (topicsNode) {
      const topicsH = root.descendants().find(d => d.data === topicsNode)
      if (topicsH) {
        if (!topicsH.children && topicsH._children) {
          topicsH.children = topicsH._children; topicsH._children = null
        }
        topicsH.children.forEach(child => {
          if (child.data._group) {
            // Expand the group node, then expand each topic within it
            if (!child.children && child._children) {
              child.children = child._children; child._children = null
            }
            ;(child.children || []).forEach(topicH => {
              if (!topicH.children && topicH._children) {
                topicH.children = topicH._children; topicH._children = null
              }
            })
          } else {
            if (!child.children && child._children) {
              child.children = child._children; child._children = null
            }
          }
        })
      }
    }
    update(root)
  }

  return (
    <div className="tree-page">
      <div className="tree-header">
        <button className="tree-btn" onClick={handleReset}>↺ Reset view</button>
        <button className="tree-btn" onClick={handleExpandTopics}>⊕ Expand all topics</button>
        <div ref={statsRef} className="tree-stats" />
      </div>

      <div ref={chartRef} className="tree-chart">
        <svg ref={svgRef} className="tree-svg" style={{ display: 'block', overflow: 'visible' }}>
          <g ref={gRef} />
        </svg>
      </div>

      <div ref={legendRef} className="tree-legend" />
      <div ref={tooltipRef} className="tree-tooltip" />
    </div>
  )
}
