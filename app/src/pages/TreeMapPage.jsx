import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './TreemapPage.css'

const SCHEMA_COLORS   = d3.schemeTableau10
const DIM_COLOR       = '#1d4ed8'
const MEAS_COLOR      = '#047857'
const TOPIC_COLOR     = '#7c3aed'
const JOIN_COLOR      = '#d97706'
const BASE_VIEW_COLOR = '#0e7490'
const JOIN_REF_COLOR  = '#5b21b6'

export default function TreeMapPage() {
  const chartRef      = useRef(null)
  const svgRef        = useRef(null)
  const tooltipRef    = useRef(null)
  const breadcrumbRef = useRef(null)
  const statsRef      = useRef(null)
  const legendRef     = useRef(null)

  useEffect(() => {
    const chartEl   = chartRef.current
    const tooltipEl = tooltipRef.current
    if (!chartEl) return

    let currentOrigData = null
    let resizeHandler   = null

    fetch('/treemap.json')
      .then(r => r.json())
      .then(data => {

        // ── 1. Pre-compute cumulative counts ──────────────
        function precomputeCount(node) {
          if (!node.children?.length) return (node._count = node.value ?? 1)
          return (node._count = node.children.reduce((s, c) => s + precomputeCount(c), 0))
        }
        precomputeCount(data)

        // ── 2. Annotate category + schema ─────────────────
        function annotate(node, depth, category, schema) {
          if (depth === 1) { node._category = node.name; category = node.name }
          else               node._category = category
          if (category === 'views') {
            if (depth === 2)    { node._schema = node.name; schema = node.name }
            else if (depth > 2)   node._schema = schema
          }
          node.children?.forEach(c => annotate(c, depth + 1, category, schema))
        }
        annotate(data, 0, null, null)

        // ── 3. Summary view ───────────────────────────────
        function summaryView(node, isRoot = false) {
          if (!node.children) return { ...node, _orig: node }
          const childrenAreFields = node.children.some(c => c.field_type != null)
          if (childrenAreFields) {
            return { name: node.name, value: node._count, _orig: node,
                     _schema: node._schema, _isGroup: true }
          }
          if (node.table_name && !isRoot) {
            return { name: node.name, value: 1, _orig: node, _schema: node._schema,
                     _isView: true, table_name: node.table_name }
          }
          return { ...node, _orig: node, children: node.children.map(c => summaryView(c)) }
        }

        // ── Color + view lookup ────────────────────────────
        const viewsNode  = data.children.find(c => c.name === 'views')
        const schemas    = viewsNode ? viewsNode.children.map(d => d.name) : []
        const viewByName = {}
        if (viewsNode) {
          viewsNode.children.forEach(schema =>
            schema.children.forEach(view => { viewByName[view.name] = view })
          )
        }
        function findView(name) {
          if (viewByName[name]) return viewByName[name]
          const idx = name.indexOf('__')
          if (idx !== -1) {
            const suffix = name.slice(idx + 2)
            if (viewByName[suffix]) return viewByName[suffix]
          }
          return null
        }
        const schemaColor    = d3.scaleOrdinal(schemas, SCHEMA_COLORS)
        const svg            = d3.select(svgRef.current)
        const breadcrumbPath = [data]

        function getSize() {
          const r = chartEl.getBoundingClientRect()
          return { w: r.width, h: r.height }
        }

        // ── Cell colour ───────────────────────────────────
        function cellColor(d, isDetail) {
          if (isDetail) return currentOrigData.name === 'measures' ? MEAS_COLOR : DIM_COLOR
          if (d.data._isGroup) return d.data.name === 'measures' ? MEAS_COLOR : DIM_COLOR
          if (d.data.ref_type === 'base_view') return BASE_VIEW_COLOR
          if (d.data.ref_type === 'join')      return JOIN_REF_COLOR
          const cat = d.data._category
          if (cat === 'topics') {
            const dk = [0, 0.5, 1.0][Math.min(Math.max(0, d.depth - 1), 2)]
            return d3.color(TOPIC_COLOR).darker(dk).formatHex()
          }
          if (cat === 'joins') {
            const dk = [0, 0.5, 1.0][Math.min(Math.max(0, d.depth - 1), 2)]
            return d3.color(JOIN_COLOR).darker(dk).formatHex()
          }
          const base = d3.color(schemaColor(d.data._schema || d.data.name))
          if (!base) return '#334155'
          const dk = [0, 0.35, 0.95, 1.5][Math.min(Math.max(0, d.depth - 2), 3)]
          return base.darker(dk).formatHex()
        }

        // ── Main render ───────────────────────────────────
        function render(rootOrigData) {
          currentOrigData = rootOrigData
          const isDetail = !!(rootOrigData.children?.some(c => c.field_type != null))
          const displayData = isDetail ? rootOrigData : summaryView(rootOrigData, true)
          const { w, h } = getSize()
          svg.attr('viewBox', `0 0 ${w} ${h}`)
          const root = d3.hierarchy(displayData).sum(d => d.value ?? 0).sort((a, b) => b.value - a.value)
          updateBreadcrumb(rootOrigData)
          updateStats(root, isDetail)

          d3.treemap().size([w, h]).paddingOuter(4)
            .paddingTop(d => {
              if (isDetail) return d.depth === 0 ? 28 : 0
              return d.depth === 0 ? 4 : (d.depth < 4 ? 22 : 0)
            })
            .paddingInner(isDetail ? 1 : 2).round(true)(root)

          svg.selectAll('*').remove()
          if (isDetail) {
            svg.append('text').attr('x', 8).attr('y', 18)
              .attr('dominant-baseline', 'middle')
              .attr('font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
              .attr('font-size', 13).attr('font-weight', 700).attr('fill', '#f1f5f9')
              .text(`${rootOrigData.name}  ·  ${rootOrigData._count} fields`)
          }

          const nodes = root.descendants().filter(d => d.depth > 0)
          const cw = d => Math.max(0, d.x1 - d.x0)
          const ch = d => Math.max(0, d.y1 - d.y0)

          const cell = svg.selectAll('g.cell').data(nodes).join('g')
            .attr('class', d => {
              let c = 'cell'
              if (!d.children)     c += ' cell-leaf'
              if (d.data._isGroup) c += ' cell-group'
              if (isDetail)        c += ' cell-field'
              if (d.data.ref_type) c += ' cell-ref'
              return c
            })
            .attr('transform', d => `translate(${d.x0},${d.y0})`)

          cell.append('rect')
            .attr('width', cw).attr('height', ch)
            .attr('fill', d => cellColor(d, isDetail)).attr('rx', 3)

          cell.append('text').attr('class', 'label-name').attr('x', 5).attr('y', 5)
            .text(d => {
              const w = cw(d); if (w < 28) return ''
              const name = d.data.label || d.data.name
              const max  = Math.floor(w / 7)
              return name.length > max ? name.slice(0, max - 1) + '…' : name
            })

          cell.filter(d => d.data._isGroup).append('text').attr('class', 'label-sub').attr('x', 5).attr('y', 20)
            .text(d => (cw(d) < 90 || ch(d) < 32) ? '' : `${d.data.value} fields — click to expand ↓`)
          cell.filter(d => d.data.ref_type).append('text').attr('class', 'label-sub').attr('x', 5).attr('y', 20)
            .text(d => {
              if (cw(d) < 60 || ch(d) < 32) return ''
              const role = d.data.ref_type === 'base_view' ? 'base view' : 'join'
              return findView(d.data.name) ? `${role} — click to explore ↓` : role
            })
          cell.filter(d => d.data._isView).append('text').attr('class', 'label-sub').attr('x', 5).attr('y', 20)
            .text(d => (cw(d) < 70 || ch(d) < 32) ? '' : `${d.data._orig._count} fields — click ↓`)
          if (!isDetail) {
            cell.filter(d => d.children && !d.data._isGroup && !d.data.ref_type)
              .append('text').attr('class', 'label-sub').attr('x', 5).attr('y', 20)
              .text(d => cw(d) < 60 ? '' : `${d.value} items`)
          }
          if (isDetail) {
            cell.append('text').attr('class', 'label-sub').attr('x', 5).attr('y', 20)
              .text(d => (cw(d) < 48 || ch(d) < 32) ? '' : (d.data.aggregate_type || d.data.format || ''))
          }

          // Tooltip
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

          cell.on('mousemove', (event, d) => {
            const orig = d.data._orig || d.data
            const rows = []
            if (orig.ref_type === 'base_view') rows.push(`<div class="tt-row"><b>Role:</b> base view</div>`)
            if (orig.ref_type === 'join')      rows.push(`<div class="tt-row"><b>Role:</b> joined view</div>`)
            if (orig.base_view && !orig.ref_type) rows.push(`<div class="tt-row"><b>Base view:</b> ${orig.base_view}</div>`)
            if (orig.table_name) rows.push(`<div class="tt-row"><b>Table:</b> ${orig.table_name}</div>`)
            if (d.data._isGroup) rows.push(`<div class="tt-row"><b>Fields:</b> ${d.data.value}</div>`)
            if (orig.field_type) rows.push(`<div class="tt-row"><b>Type:</b> ${orig.field_type}</div>`)
            if (orig.aggregate_type) rows.push(`<div class="tt-row"><b>Aggregate:</b> ${orig.aggregate_type}</div>`)
            if (orig.format)     rows.push(`<div class="tt-row"><b>Format:</b> ${orig.format}</div>`)
            if (orig.sql)        rows.push(`<div class="tt-row"><b>SQL:</b> <code>${orig.sql}</code></div>`)
            if (orig._schema)    rows.push(`<div class="tt-row"><b>Schema:</b> ${orig._schema}</div>`)
            // Topic metadata
            if (orig.description) rows.push(`<div class="tt-row"><b>Description:</b> ${orig.description}</div>`)
            if (orig.display_order !== undefined && orig.display_order !== null)
              rows.push(`<div class="tt-row"><b>Display order:</b> ${orig.display_order}</div>`)
            if (orig.default_filters)
              rows.push(`<div class="tt-row"><b>Default filters:</b><br><code style="white-space:pre">${formatFilters(orig.default_filters)}</code></div>`)
            if (orig.ai_context_chars)
              rows.push(`<div class="tt-row"><b>AI context:</b> ${orig.ai_context_chars} chars</div>`)
            if (orig.sample_queries_chars)
              rows.push(`<div class="tt-row"><b>Sample queries:</b> ${orig.sample_queries_chars} chars</div>`)
            tooltipEl.innerHTML = `<div class="tt-title">${d.data.label || d.data.name}</div>${rows.join('')}`
            tooltipEl.classList.add('visible')
            const rect = chartEl.getBoundingClientRect()
            let tx = event.clientX - rect.left + 14
            let ty = event.clientY - rect.top  + 14
            if (tx + 280 > rect.width)  tx = event.clientX - rect.left - 280
            if (ty + tooltipEl.offsetHeight > rect.height) ty = event.clientY - rect.top - tooltipEl.offsetHeight - 4
            tooltipEl.style.left = tx + 'px'
            tooltipEl.style.top  = ty + 'px'
          }).on('mouseleave', () => tooltipEl.classList.remove('visible'))

          // Click drill-down
          cell.on('click', (event, d) => {
            event.stopPropagation()
            const origNode = d.data._orig || d.data
            if (origNode.field_type != null) return
            if (origNode.ref_type != null) {
              const target = findView(origNode.name)
              if (target) render(target)
              return
            }
            if (origNode === rootOrigData) return
            render(origNode)
          })
        }

        // ── Breadcrumb ────────────────────────────────────
        function updateBreadcrumb(rootOrigData) {
          const idx = breadcrumbPath.findIndex(d => d === rootOrigData)
          if (idx === -1) breadcrumbPath.push(rootOrigData)
          else            breadcrumbPath.splice(idx + 1)
          const bc = breadcrumbRef.current
          bc.innerHTML = breadcrumbPath.map((d, i) => {
            const isLast = i === breadcrumbPath.length - 1
            const sep    = i > 0 ? `<span class="sep">/</span>` : ''
            if (isLast) return `${sep}<span class="current">${d.name}</span>`
            return `${sep}<span data-idx="${i}">${d.name}</span>`
          }).join('')
          bc.querySelectorAll('[data-idx]').forEach(el =>
            el.addEventListener('click', () => render(breadcrumbPath[+el.dataset.idx]))
          )
        }

        // ── Stats ─────────────────────────────────────────
        function updateStats(root, isDetail) {
          const viewCount  = root.descendants().filter(d => d.data.table_name && !d.data.ref_type).length
          const topicCount = root.descendants().filter(d => d.data.base_view  && !d.data.ref_type).length
          const fieldCount = root.value
          let html = ''
          if (!isDetail) {
            if (topicCount) html += `<span><b>${topicCount}</b> topics</span>`
            if (viewCount)  html += `<span><b>${viewCount}</b> views</span>`
          }
          html += `<span><b>${fieldCount}</b> ${isDetail ? 'fields' : 'items'}</span>`
          statsRef.current.innerHTML = html
        }

        // ── Legend ────────────────────────────────────────
        function buildLegend() {
          const schemaItems = schemas.map(s =>
            `<div class="legend-item"><div class="legend-swatch" style="background:${schemaColor(s)}"></div><span>${s}</span></div>`
          ).join('')
          legendRef.current.innerHTML =
            `<div class="legend-item"><div class="legend-swatch" style="background:${TOPIC_COLOR}"></div><span>topics</span></div>` +
            `<div class="legend-item"><div class="legend-swatch" style="background:${JOIN_COLOR}"></div><span>joins</span></div>` +
            `<span class="legend-sep">|</span>` + schemaItems + `<span class="legend-sep">|</span>` +
            `<div class="legend-item"><div class="legend-swatch" style="background:${BASE_VIEW_COLOR}"></div><span>base view</span></div>` +
            `<div class="legend-item"><div class="legend-swatch" style="background:${JOIN_REF_COLOR}"></div><span>join ref</span></div>` +
            `<div class="legend-item"><div class="legend-swatch" style="background:${DIM_COLOR}"></div><span>dimensions</span></div>` +
            `<div class="legend-item"><div class="legend-swatch" style="background:${MEAS_COLOR}"></div><span>measures</span></div>` +
            `<span class="hint">Click a topic, view, or group to drill in · Breadcrumb to navigate back</span>`
        }

        buildLegend()
        render(data)
        resizeHandler = () => { if (currentOrigData) render(currentOrigData) }
        window.addEventListener('resize', resizeHandler)
      })
      .catch(err => {
        chartEl.innerHTML = `<p style="padding:20px;color:#f87171">Failed to load treemap.json: ${err.message}</p>`
      })

    return () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      if (svgRef.current) d3.select(svgRef.current).selectAll('*').remove()
    }
  }, [])

  return (
    <div className="treemap-page">
      <div className="treemap-header">
        <div ref={breadcrumbRef} className="treemap-breadcrumb">
          <span className="current">omni</span>
        </div>
        <div ref={statsRef} className="treemap-stats" />
      </div>
      <div ref={chartRef} className="treemap-chart">
        <svg ref={svgRef} className="treemap-svg" />
        <div ref={tooltipRef} className="treemap-tooltip" />
      </div>
      <div ref={legendRef} className="treemap-legend" />
    </div>
  )
}
