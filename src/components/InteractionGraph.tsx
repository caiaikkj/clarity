import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useI18n } from '../i18n'
import type { GraphEdge, GraphNode } from '../lib/graph'
import { SEVERITY_COLOR } from './ui'

interface Body {
  x: number
  y: number
  vx: number
  vy: number
  pinned: boolean
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  height?: number
}

const PADDING = 48

const nodeRadius = (n: GraphNode) => (n.kind === 'med' ? 30 : 20 + Math.min(8, n.count * 1.5))

const nodeColor = (n: GraphNode) => {
  if (n.kind === 'symptom') return '#fb7185'
  if (n.kind === 'habit') return '#34d399'
  if (n.category === 'prescription') return '#818cf8'
  if (n.category === 'otc') return '#c4b5fd'
  return '#38bdf8'
}

const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const InteractionGraph = ({ nodes, edges, selectedId, onSelect, height = 520 }: Props) => {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const bodies = useRef(new Map<string, Body>())
  const alpha = useRef(1)
  const raf = useRef(0)
  const [width, setWidth] = useState(800)
  const [, setFrame] = useState(0)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const drag = useRef<{ id: string; moved: boolean } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const topology = useMemo(
    () => `${nodes.map((n) => n.id).join(',')}|${edges.map((e) => e.id).join(',')}`,
    [nodes, edges],
  )

  const step = useCallback(() => {
    const list = [...bodies.current.entries()]
    const a = alpha.current
    const cx = width / 2
    const cy = height / 2
    const scale = Math.min(1, Math.max(0.5, width / 900))
    const repulsion = 32000 * scale * scale

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i][1]
        const q = list[j][1]
        let dx = p.x - q.x
        let dy = p.y - q.y
        const d2 = Math.max(dx * dx + dy * dy, 400)
        const d = Math.sqrt(d2)
        const force = (repulsion / d2) * a
        dx /= d
        dy /= d
        p.vx += dx * force
        p.vy += dy * force
        q.vx -= dx * force
        q.vy -= dy * force
      }
    }

    edges.forEach((e) => {
      const s = bodies.current.get(e.source)
      const t = bodies.current.get(e.target)
      if (!s || !t) return
      const dx = t.x - s.x
      const dy = t.y - s.y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const rest = (e.severity ? 190 : 165) * Math.max(0.6, scale)
      const f = (d - rest) * 0.03 * a
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      s.vx += fx
      s.vy += fy
      t.vx -= fx
      t.vy -= fy
    })

    list.forEach(([, b]) => {
      b.vx += (cx - b.x) * 0.007 * a
      b.vy += (cy - b.y) * 0.011 * a
      if (b.pinned) {
        b.vx = 0
        b.vy = 0
        return
      }
      b.vx *= 0.8
      b.vy *= 0.8
      b.x = Math.min(width - PADDING, Math.max(PADDING, b.x + b.vx))
      b.y = Math.min(height - PADDING, Math.max(PADDING, b.y + b.vy))
    })

    alpha.current *= 0.985
  }, [edges, width, height])

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    const tick = () => {
      step()
      setFrame((f) => f + 1)
      if (alpha.current > 0.02 || drag.current) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [step])

  useEffect(() => {
    const map = bodies.current
    const ids = new Set(nodes.map((n) => n.id))
    ;[...map.keys()].forEach((id) => !ids.has(id) && map.delete(id))
    const missing = nodes.filter((n) => !map.has(n.id))
    missing.forEach((n, i) => {
      const angle = (i / Math.max(missing.length, 1)) * Math.PI * 2 + (n.kind === 'med' ? 0 : 0.6)
      const radius = (n.kind === 'med' ? 0.22 : 0.36) * Math.min(width, height)
      map.set(n.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        pinned: false,
      })
    })
    alpha.current = 1
    run()
    return () => cancelAnimationFrame(raf.current)
  }, [topology, width, height])

  const toLocal = (e: ReactPointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: Math.min(width - 20, Math.max(20, ((e.clientX - rect.left) / rect.width) * width)),
      y: Math.min(height - 20, Math.max(20, ((e.clientY - rect.top) / rect.height) * height)),
    }
  }

  const onDown = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id, moved: false }
    const b = bodies.current.get(id)
    if (b) b.pinned = true
    alpha.current = Math.max(alpha.current, 0.4)
    run()
  }

  const onMove = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    if (drag.current?.id !== id) return
    const b = bodies.current.get(id)
    if (!b) return
    const p = toLocal(e)
    if (Math.abs(p.x - b.x) + Math.abs(p.y - b.y) > 3) drag.current.moved = true
    b.x = p.x
    b.y = p.y
    alpha.current = Math.max(alpha.current, 0.3)
  }

  const onUp = (id: string) => {
    const b = bodies.current.get(id)
    if (b) b.pinned = false
    if (drag.current && !drag.current.moved) onSelect(selectedId === id ? null : id)
    drag.current = null
    alpha.current = Math.max(alpha.current, 0.25)
    run()
  }

  const focusId = hoverId ?? selectedId
  const neighbors = useMemo(() => {
    const set = new Set<string>()
    if (!focusId) return set
    set.add(focusId)
    edges.forEach((e) => {
      if (e.source === focusId) set.add(e.target)
      if (e.target === focusId) set.add(e.source)
    })
    return set
  }, [edges, focusId])

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('graph.aria')}
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => e.target === e.currentTarget && onSelect(null)}
      >
        <defs>
          <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((e) => {
          const s = bodies.current.get(e.source)
          const t = bodies.current.get(e.target)
          if (!s || !t) return null
          const active = !focusId || (neighbors.has(e.source) && neighbors.has(e.target) && (e.source === focusId || e.target === focusId))
          const color = e.severity ? SEVERITY_COLOR[e.severity] : '#7dd3fc'
          return (
            <line
              key={e.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={color}
              strokeWidth={e.severity ? 2.2 : 1 + Math.min(3, e.weight * 0.7)}
              strokeLinecap="round"
              strokeDasharray={e.severity ? undefined : '2 6'}
              opacity={active ? (e.severity ? 0.85 : 0.5) : 0.07}
              style={{ transition: 'opacity 400ms ease', filter: e.severity ? `drop-shadow(0 0 4px ${color})` : undefined }}
            />
          )
        })}

        {nodes.map((n) => {
          const b = bodies.current.get(n.id)
          if (!b) return null
          const r = nodeRadius(n)
          const color = nodeColor(n)
          const dimmed = focusId !== null && !neighbors.has(n.id)
          const selected = selectedId === n.id
          return (
            <g
              key={n.id}
              transform={`translate(${b.x},${b.y})`}
              style={{ cursor: 'grab', touchAction: 'none', opacity: dimmed ? 0.22 : 1, transition: 'opacity 400ms ease' }}
              onPointerDown={(e) => onDown(e, n.id)}
              onPointerMove={(e) => onMove(e, n.id)}
              onPointerUp={() => onUp(n.id)}
              onPointerCancel={() => onUp(n.id)}
              onPointerEnter={() => setHoverId(n.id)}
              onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              role="button"
              aria-label={`${n.label}, ${t(`brain.kind.${n.kind}`)}`}
            >
              <circle r={r + 7} fill={color} opacity={selected ? 0.28 : 0.1} style={{ transition: 'opacity 300ms ease' }} />
              <circle
                r={r}
                fill="rgba(15,23,42,0.55)"
                stroke={color}
                strokeWidth={selected ? 3 : 1.75}
                filter={selected ? 'url(#node-glow)' : undefined}
              />
              <circle r={r - 3} fill={color} opacity={0.16} />
              <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={n.kind === 'med' ? 17 : 14} fontWeight={650}>
                {n.label.charAt(0).toUpperCase()}
              </text>
              <text
                y={r + 17}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={12}
                fontWeight={550}
                stroke="#090D16"
                strokeWidth={4}
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {truncate(n.label)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
