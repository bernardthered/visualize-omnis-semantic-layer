import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './SunburstPage.css'

const DIM_COLOR       = '#1d4ed8'
const MEAS_COLOR      = '#047857'
const TOPIC_COLOR     = '#7c3aed'
const JOIN_COLOR      = '#d97706'
const BASE_VIEW_COLOR = '#0e7490'
const JOIN_REF_COLOR  = '#5b21b6'
const SCHEMA_COLORS   = d3.schemeTableau10

export default function SunburstPage() {
  const containerRef = useRef(null)
  const legendRef    = useRef(null)
  const tooltipRef   = useRef(null)

  useEffect(() => {
    const el        = containerRef.current
    const legendEl  = legendRef.current
    const tooltipEl = tooltipRef.current
    if (!el) return

    let resizeHandler = null

    fetch('/treemap.json')
      .then(r => r.json())
      .then(rawData => {

        // ── Annotate _category + _schema ─────────────────
        function annotate(node, depth, cat, schema) {
          if (depth === 1) { node._category = node.name; cat = node.name }
          else               node._category = cat
          if (cat === 'views') {
            if (depth === 2)    { node._schema = node.name; schema = node.name }
            else if (depth > 2)   node._schema = schema
          }
          node.children?.forEach(c => annotate(c, depth + 1, cat, schema))
        }
        annotate(rawData, 0, null, null)

        // ── Color helpers ─────────────────────────────────
        const viewsNode  = rawData.children.find(c => c.name === 'views')
        const schemas    = viewsNode ? viewsNode.children.map(d => d.name) : []
        const schemaColor = d3.scaleOrdinal(schemas, SCHEMA_COLORS)

        function nodeColor(d) {
          const dt = d.data
          if (dt.ref_type === 'base_view')   return BASE_VIEW_COLOR
          if (dt.ref_type === 'join')        return JOIN_REF_COLOR
          if (dt.field_type === 'dimension') return DIM_COLOR
          if (dt.field_type === 'measure')   return MEAS_COLOR
          if (dt.name === 'dimensions')      return DIM_COLOR
          if (dt.name === 'measures')        return MEAS_COLOR
          const cat = dt._category
          if (cat === 'topics')
            return d3.color(TOPIC_COLOR).darker(Math.min(d.depth * 0.22, 1.1)).formatHex()
          if (cat === 'joins')
            return d3.color(JOIN_COLOR).darker(Math.min(d.depth * 0.22, 1.1)).formatHex()
          const base = d3.color(schemaColor(dt._schema || dt.name))
          return base ? base.darker(Math.min((d.depth - 2) * 0.3, 1.2)).formatHex() : '#334155'
        }

        // ── Format helpers ────────────────────────────────
        function formatFilters(filters) {
          if (!filters || typeof filters !== 'object') return ''
          return Object.entries(filters).map(([field, cond]) => {
            if (cond && typeof cond === 'object') {
              const parts = Object.entries(cond).map(([op, val]) => {
                const v = Array.isArray(val) ? '[' + val.join(', ') + ']' : String(val)
                return `${op}: ${v}`
              })
              return `${field} → ${parts.join(', ')}`
            }
            return `${field}: ${String(cond)}`
          }).join('\n')
        }

        // ── Legend (built once) ───────────────────────────
        const schemaItems = schemas.map(s =>
          `<div class="legend-item"><div class="legend-dot" style="background:${schemaColor(s)}"></div><span>${s}</span></div>`
        ).join('')
        legendEl.innerHTML =
          `<div class="legend-item"><div class="legend-dot" style="background:${TOPIC_COLOR}"></div><span>topics</span></div>` +
          `<div class="legend-item"><div class="legend-dot" style="background:${JOIN_COLOR}"></div><span>joins</span></div>` +
          `<span class="legend-sep">|</span>` + schemaItems + `<span class="legend-sep">|</span>` +
          `<div class="legend-item"><div class="legend-dot" style="background:${BASE_VIEW_COLOR}"></div><span>base view</span></div>` +
          `<div class="legend-item"><div class="legend-dot" style="background:${JOIN_REF_COLOR}"></div><span>join ref</span></div>` +
          `<div class="legend-item"><div class="legend-dot" style="background:${DIM_COLOR}"></div><span>dimensions</span></div>` +
          `<div class="legend-item"><div class="legend-dot" style="background:${MEAS_COLOR}"></div><span>measures</span></div>` +
          `<span class="legend-hint">Click a segment to zoom in · Click center to zoom out · Alt+click for slow motion</span>`

        // ── Build chart (called on mount + resize) ────────
        function build() {
          d3.select(el).selectAll('svg').remove()
          const { width, height } = el.getBoundingClientRect()
          const size   = Math.min(width, height) - 8
          const radius = size / 6

          // Hierarchy + partition
          const root = d3.hierarchy(rawData)
            .sum(d => d.children ? 0 : (d.value ?? 1))
            .sort((a, b) => b.value - a.value)
          d3.partition().size([2 * Math.PI, root.height + 1])(root)
          root.each(d => { d.current = d })

          const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius * 1.5)
            .innerRadius(d => d.y0 * radius)
            .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

          function arcVisible(d) {
            return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
          }
          function labelVisible(d) {
            return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.04
          }
          function labelTransform(d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI
            const y = (d.y0 + d.y1) / 2 * radius
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
          }

          const svg = d3.select(el).append('svg')
            .attr('viewBox', [-size / 2, -size / 2, size, size])
            .style('width', '100%').style('height', '100%')
            .style('display', 'block')
            .style('font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")

          // ── Arcs ──────────────────────────────────────────
          const path = svg.append('g')
            .selectAll('path')
            .data(root.descendants().slice(1))
            .join('path')
              .attr('fill', nodeColor)
              .attr('fill-opacity', d => arcVisible(d.current) ? (d.children ? 0.85 : 0.55) : 0)
              .attr('pointer-events', d => arcVisible(d.current) ? 'auto' : 'none')
              .attr('d', d => arc(d.current))

          path.filter(d => d.children)
            .style('cursor', 'pointer')
            .on('click', clicked)
          path.on('mousemove', showTooltip)
              .on('mouseleave', () => tooltipEl.classList.remove('visible'))

          // ── Labels ────────────────────────────────────────
          const label = svg.append('g')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .style('user-select', 'none')
            .selectAll('text')
            .data(root.descendants().slice(1))
            .join('text')
              .attr('dy', '0.35em')
              .attr('fill', '#f1f5f9')
              .attr('font-size', '11px')
              .attr('fill-opacity', d => +labelVisible(d.current))
              .attr('transform', d => labelTransform(d.current))
              .text(d => {
                const name = d.data.label || d.data.name
                return name.length > 18 ? name.slice(0, 17) + '…' : name
              })

          // ── Center circle (zoom out on click) ─────────────
          const parentCircle = svg.append('circle')
            .datum(root)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('click', clicked)

          // ── Center label ──────────────────────────────────
          const centerText = svg.append('text')
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', '#94a3b8').attr('font-size', '13px').attr('font-weight', '600')
            .style('pointer-events', 'none')
            .text(rawData.name)

          // ── Zoom ──────────────────────────────────────────
          function clicked(event, p) {
            parentCircle.datum(p.parent || root)

            root.each(d => (d.target = {
              x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
              x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
              y0: Math.max(0, d.y0 - p.depth),
              y1: Math.max(0, d.y1 - p.depth),
            }))

            const t = svg.transition().duration(event.altKey ? 7500 : 750)

            path.transition(t)
              .tween('data', d => {
                const i = d3.interpolate(d.current, d.target)
                return t => { d.current = i(t) }
              })
              .filter(function(d) {
                return +this.getAttribute('fill-opacity') || arcVisible(d.target)
              })
              .attr('fill-opacity', d => arcVisible(d.target) ? (d.children ? 0.85 : 0.55) : 0)
              .attr('pointer-events', d => arcVisible(d.target) ? 'auto' : 'none')
              .attrTween('d', d => () => arc(d.current))

            label.filter(function(d) {
              return +this.getAttribute('fill-opacity') || labelVisible(d.target)
            }).transition(t)
              .attr('fill-opacity', d => +labelVisible(d.target))
              .attrTween('transform', d => () => labelTransform(d.current))

            centerText.text(p.depth > 0 ? (p.data.label || p.data.name) : rawData.name)
            tooltipEl.classList.remove('visible')
          }

          // ── Tooltip ───────────────────────────────────────
          function showTooltip(event, d) {
            const dt = d.data
            const rows = []
            if (dt._category) rows.push(`<div class="tt-row"><b>Section:</b> ${dt._category}</div>`)
            if (dt.ref_type === 'base_view')  rows.push(`<div class="tt-row"><b>Role:</b> base view</div>`)
            else if (dt.ref_type === 'join')  rows.push(`<div class="tt-row"><b>Role:</b> join ref</div>`)
            if (dt.base_view && !dt.ref_type) rows.push(`<div class="tt-row"><b>Base view:</b> ${dt.base_view}</div>`)
            if (dt.table_name) rows.push(`<div class="tt-row"><b>Table:</b> ${dt.table_name}</div>`)
            if (dt._schema)    rows.push(`<div class="tt-row"><b>Schema:</b> ${dt._schema}</div>`)
            if (dt.field_type) rows.push(`<div class="tt-row"><b>Type:</b> ${dt.field_type}</div>`)
            if (dt.aggregate_type) rows.push(`<div class="tt-row"><b>Aggregate:</b> ${dt.aggregate_type}</div>`)
            if (dt.sql)        rows.push(`<div class="tt-row"><b>SQL:</b> <code>${dt.sql}</code></div>`)
            if (dt.description) rows.push(`<div class="tt-row"><b>Description:</b> ${dt.description}</div>`)
            if (dt.display_order !== undefined && dt.display_order !== null)
              rows.push(`<div class="tt-row"><b>Display order:</b> ${dt.display_order}</div>`)
            if (dt.default_filters)
              rows.push(`<div class="tt-row"><b>Default filters:</b><br><code style="white-space:pre">${formatFilters(dt.default_filters)}</code></div>`)
            if (dt.ai_context_chars)
              rows.push(`<div class="tt-row"><b>AI context:</b> ${dt.ai_context_chars} chars</div>`)
            if (dt.sample_queries_chars)
              rows.push(`<div class="tt-row"><b>Sample queries:</b> ${dt.sample_queries_chars} chars</div>`)
            if (d.children)
              rows.push(`<div class="tt-row"><b>Children:</b> ${d.children.length}</div>`)

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
        }

        build()
        resizeHandler = () => { tooltipEl.classList.remove('visible'); build() }
        window.addEventListener('resize', resizeHandler)
      })
      .catch(err => {
        el.innerHTML = `<p style="padding:20px;color:#f87171">Failed to load treemap.json: ${err.message}</p>`
      })

    return () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      d3.select(el).selectAll('svg').remove()
    }
  }, [])

  return (
    <div className="sunburst-page">
      <div ref={containerRef} className="sunburst-chart" />
      <div ref={legendRef}    className="sunburst-legend" />
      <div ref={tooltipRef}   className="sunburst-tooltip" />
    </div>
  )
}
