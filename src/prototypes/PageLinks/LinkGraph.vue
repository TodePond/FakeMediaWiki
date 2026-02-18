<template>
	<div class="link-graph-wrapper" ref="containerRef">
		<button
			type="button"
			class="fullscreen-toggle"
			:aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
			@click="toggleFullscreen"
		>
			{{ isFullscreen ? "✕" : "⛶" }}
		</button>
		<svg class="link-graph" ref="svgRef" :viewBox="`0 0 ${width} ${height}`">
			<g ref="zoomGRef">
				<g class="links" ref="linksRef" aria-hidden="true" />
				<g class="nodes" ref="nodesRef" aria-hidden="true" />
			</g>
		</svg>
		<div
			v-if="tooltip"
			class="graph-tooltip"
			:style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
		>
			<div class="graph-tooltip-title">{{ tooltip.node.id }}</div>
			<div class="graph-tooltip-stats">
				<span>Out: {{ tooltip.outgoing }}</span>
				<span>In: {{ tooltip.incoming }}</span>
			</div>
			<div v-if="tooltip.linkedFromQuery.length > 0" class="graph-tooltip-list">
				<span class="graph-tooltip-label">Linked from:</span>
				{{ tooltip.linkedFromQuery.join(", ") }}
			</div>
			<div v-if="tooltip.linksToQuery.length > 0" class="graph-tooltip-list">
				<span class="graph-tooltip-label">Links to:</span>
				{{ tooltip.linksToQuery.join(", ") }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import * as d3 from "d3"
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"

export type GraphNode = { id: string; isQuery?: boolean }
export type GraphLink = { source: string; target: string }
export type GraphData = { nodes: GraphNode[]; links: GraphLink[] }

const props = defineProps<{
	graphData: GraphData | null
	queryPageNames?: string[]
}>()

const emit = defineEmits<{ addToQuery: [pageName: string]; removeFromQuery: [pageName: string] }>()

const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const zoomGRef = ref<SVGGElement | null>(null)
const linksRef = ref<SVGGElement | null>(null)
const nodesRef = ref<SVGGElement | null>(null)

const width = ref(800)
const height = ref(420)
const isFullscreen = ref(false)
const isPointerDown = ref(false)
const wasDragging = ref(false)

const tooltip = ref<{
	node: GraphNode
	x: number
	y: number
	outgoing: number
	incoming: number
	linkedFromQuery: string[]
	linksToQuery: string[]
} | null>(null)

const outgoingCount = computed(() => {
	const m = new Map<string, number>()
	for (const l of props.graphData?.links ?? []) {
		const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id
		m.set(s, (m.get(s) ?? 0) + 1)
	}
	return m
})
const incomingCount = computed(() => {
	const m = new Map<string, number>()
	for (const l of props.graphData?.links ?? []) {
		const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id
		m.set(t, (m.get(t) ?? 0) + 1)
	}
	return m
})

let simulation: d3.Simulation<GraphNode & d3.SimulationNodeDatum, GraphLink> | null = null
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null

function initSimulation(nodes: (GraphNode & d3.SimulationNodeDatum)[], links: GraphLink[]) {
	if (!svgRef.value || !linksRef.value || !nodesRef.value || !zoomGRef.value) return

	const w = width.value
	const h = height.value

	simulation?.stop()
	simulation = d3
		.forceSimulation(nodes)
		.alphaDecay(0.05)
		.force(
			"link",
			d3
				.forceLink(links)
				.id((d: GraphNode & d3.SimulationNodeDatum) => d.id)
				.distance(100)
				.strength(0.2)
		)
		.force("charge", d3.forceManyBody().strength(-20))
		.force("center", d3.forceCenter(w / 2, h / 2))
		.force("collision", d3.forceCollide().radius(2))

	const linkElements = d3
		.select(linksRef.value)
		.selectAll<SVGLineElement, GraphLink>("line")
		.data(links, (d: GraphLink) => {
			const a = typeof d.source === "string" ? d.source : (d.source as { id: string }).id
			const b = typeof d.target === "string" ? d.target : (d.target as { id: string }).id
			return `${a}-${b}`
		})
		.join("line")
		.attr("stroke", "#a2a9b1")
		.attr("stroke-opacity", 0.6)
		.attr("stroke-width", 1.5)
		.attr("pointer-events", "none")

	const nodeElements = d3
		.select(nodesRef.value)
		.selectAll<SVGGElement, GraphNode & d3.SimulationNodeDatum>("g.node")
		.data(nodes, (d: GraphNode & d3.SimulationNodeDatum) => d.id)
		.join(enter =>
			enter
				.append("g")
				.attr("cursor", "pointer")
				.attr("pointer-events", "all")
				.call(
					d3
						.drag<SVGGElement, GraphNode & d3.SimulationNodeDatum>()
						.on("start", (event, d) => {
							const nodeEl = (event.sourceEvent?.target as Element)?.closest?.(
								".node"
							)
							if (nodeEl) {
								d3.select(nodeEl as SVGGElement)
									.select("circle")
									.attr("stroke", "#fff")
									.attr(
										"stroke-width",
										(d as GraphNode & { isQuery?: boolean }).isQuery ? 3 : 2
									)
							}
							if (!event.active) simulation?.alphaTarget(0.3).restart()
							d.fx = d.x
							d.fy = d.y
						})
						.on("drag", (event, d) => {
							wasDragging.value = true
							d.fx = event.x
							d.fy = event.y
						})
						.on("end", (event, d) => {
							setTimeout(() => {
								wasDragging.value = false
							}, 0)
							if (!event.active) simulation?.alphaTarget(0.3).restart()
							d.fx = null
							d.fy = null
						})
				)
				.on("mouseover", (event, d) => {
					if (isPointerDown.value) return
					const node = d as GraphNode & d3.SimulationNodeDatum
					const id = node.id
					const g = event.currentTarget as SVGGElement

					const connectedIds = new Set<string>()
					for (const l of props.graphData?.links ?? []) {
						const s =
							typeof l.source === "string"
								? l.source
								: (l.source as { id: string }).id
						const t =
							typeof l.target === "string"
								? l.target
								: (l.target as { id: string }).id
						if (s === id) connectedIds.add(t)
						if (t === id) connectedIds.add(s)
					}

					d3.select(g).classed("node-highlight-self", true)
					d3.select(nodesRef.value!)
						.selectAll<SVGGElement, GraphNode & d3.SimulationNodeDatum>("g.node")
						.classed("node-highlight", (n: GraphNode & d3.SimulationNodeDatum) =>
							connectedIds.has(n.id)
						)
					d3.select(linksRef.value!)
						.selectAll<SVGLineElement, GraphLink>("line")
						.classed("link-highlight", (link: GraphLink) => {
							const s =
								typeof link.source === "string"
									? link.source
									: (link.source as { id: string }).id
							const t =
								typeof link.target === "string"
									? link.target
									: (link.target as { id: string }).id
							return s === id || t === id
						})

					const links = props.graphData?.links ?? []
					const querySet = new Set(props.queryPageNames ?? [])
					const linkedFromQuery = [...querySet].filter(q =>
						links.some(
							l =>
								(typeof l.source === "string"
									? l.source
									: (l.source as { id: string }).id) === q &&
								(typeof l.target === "string"
									? l.target
									: (l.target as { id: string }).id) === node.id
						)
					)
					const linksToQuery = [...querySet].filter(q =>
						links.some(
							l =>
								(typeof l.source === "string"
									? l.source
									: (l.source as { id: string }).id) === node.id &&
								(typeof l.target === "string"
									? l.target
									: (l.target as { id: string }).id) === q
						)
					)
					const rect = containerRef.value?.getBoundingClientRect()
					tooltip.value = {
						node: { id: node.id, isQuery: node.isQuery },
						x: rect ? event.clientX - rect.left + 12 : event.offsetX + 12,
						y: rect ? event.clientY - rect.top + 12 : event.offsetY + 12,
						outgoing: outgoingCount.value.get(node.id) ?? 0,
						incoming: incomingCount.value.get(node.id) ?? 0,
						linkedFromQuery,
						linksToQuery,
					}
				})
				.on("mouseout", () => {
					d3.select(nodesRef.value!)
						.selectAll<SVGGElement, GraphNode & d3.SimulationNodeDatum>("g.node")
						.classed("node-highlight-self", false)
						.classed("node-highlight", false)
					d3.select(linksRef.value!).selectAll("line").classed("link-highlight", false)
					tooltip.value = null
				})
				.on("click", (_event, d) => {
					if (wasDragging.value) return
					const node = d as GraphNode & d3.SimulationNodeDatum
					if (node.isQuery) {
						emit("removeFromQuery", node.id)
					} else {
						emit("addToQuery", node.id)
					}
				})
		)
		.attr(
			"class",
			(d: GraphNode & d3.SimulationNodeDatum) =>
				"node" + ((d as GraphNode).isQuery ? " node-query" : "")
		)
		.each(function (this: SVGGElement, d) {
			const isQuery = (d as GraphNode & { isQuery?: boolean }).isQuery
			const g = d3.select(this)
			g.selectAll("circle").remove()
			g.append("circle")
				.attr("r", isQuery ? 14 : 7)
				.attr("fill", isQuery ? "var(--color-progressive)" : "var(--color-base)")
				.attr("stroke", "#fff")
				.attr("stroke-width", isQuery ? 3 : 2)
		})

	let tickScheduled = false
	simulation.on("tick", () => {
		if (tickScheduled) return
		tickScheduled = true
		requestAnimationFrame(() => {
			tickScheduled = false
			linkElements
				.attr("x1", d => (d.source as d3.SimulationNodeDatum).x ?? 0)
				.attr("y1", d => (d.source as d3.SimulationNodeDatum).y ?? 0)
				.attr("x2", d => (d.target as d3.SimulationNodeDatum).x ?? 0)
				.attr("y2", d => (d.target as d3.SimulationNodeDatum).y ?? 0)
			nodeElements.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`)
		})
	})
}

function setupZoom() {
	if (!svgRef.value || !zoomGRef.value) return
	const w = width.value
	const h = height.value
	const initialScale = 0.2
	zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.06, 4])
		.on("zoom", event => {
			d3.select(zoomGRef.value!).attr("transform", event.transform)
		})
	const sel = d3.select(svgRef.value).call(zoom)
	sel.call(
		zoom.transform,
		d3.zoomIdentity
			.translate(w / 2, h / 2)
			.scale(initialScale)
			.translate(-w / 2, -h / 2)
	)
}

function toggleFullscreen() {
	if (!containerRef.value) return
	if (document.fullscreenElement) {
		document.exitFullscreen()
		isFullscreen.value = false
	} else {
		containerRef.value.requestFullscreen()
		isFullscreen.value = true
	}
}

function onFullscreenChange() {
	isFullscreen.value = document.fullscreenElement === containerRef.value
}

watch(
	() => props.graphData,
	async data => {
		if (!data || data.nodes.length === 0) return
		await nextTick()
		const nodes = data.nodes
			.map(n => ({
				...n,
				x: width.value / 2 + (Math.random() - 0.5) * 80,
				y: height.value / 2 + (Math.random() - 0.5) * 80,
			}))
			.sort((a, b) => (a.isQuery ? 1 : 0) - (b.isQuery ? 1 : 0))
		const links = data.links.map(l => ({ ...l }))
		initSimulation(nodes, links)
	},
	{ immediate: true }
)

watch(
	[containerRef],
	() => {
		if (!containerRef.value) return
		const ro = new ResizeObserver(entries => {
			const entry = entries[0]
			if (!entry) return
			const { width: w, height: h } = entry.contentRect
			if (w > 0 && h > 0) {
				width.value = w
				height.value = h
				if (simulation) {
					simulation.force("center", d3.forceCenter(width.value / 2, height.value / 2))
				}
			}
		})
		ro.observe(containerRef.value)
		return () => ro.disconnect()
	},
	{ immediate: true }
)

watch(
	[svgRef, zoomGRef],
	([svg, g]) => {
		if (svg && g) setupZoom()
	},
	{ immediate: true }
)

function captureWheel(e: WheelEvent) {
	e.preventDefault()
}

let wheelEl: HTMLElement | null = null
function onPointerDown() {
	isPointerDown.value = true
	tooltip.value = null
}
function onPointerUp() {
	isPointerDown.value = false
}

onMounted(() => {
	document.addEventListener("fullscreenchange", onFullscreenChange)
	document.addEventListener("pointerup", onPointerUp)
	document.addEventListener("pointercancel", onPointerUp)
	wheelEl = containerRef.value
	if (wheelEl) {
		wheelEl.addEventListener("wheel", captureWheel, { passive: false, capture: true })
		wheelEl.addEventListener("pointerdown", onPointerDown, { capture: true })
	}
})
onUnmounted(() => {
	document.removeEventListener("fullscreenchange", onFullscreenChange)
	document.removeEventListener("pointerup", onPointerUp)
	document.removeEventListener("pointercancel", onPointerUp)
	if (wheelEl) {
		wheelEl.removeEventListener("wheel", captureWheel, { capture: true })
		wheelEl.removeEventListener("pointerdown", onPointerDown, { capture: true })
		wheelEl = null
	}
})

defineExpose({ simulation })
</script>

<style scoped>
.link-graph-wrapper {
	position: relative;
	width: 100%;
	height: 420px;
	min-height: 280px;
	background: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
	overflow: hidden;
	touch-action: none;
	isolate: isolate;
}

.link-graph-wrapper:fullscreen,
.link-graph-wrapper:-webkit-full-screen {
	height: 100vh;
	min-height: 100vh;
}

.fullscreen-toggle {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	z-index: 5;
	width: 2rem;
	height: 2rem;
	padding: 0;
	font-size: 1.25rem;
	line-height: 1;
	color: var(--color-base);
	background: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
	cursor: pointer;
	opacity: 0.8;
}
.fullscreen-toggle:hover {
	opacity: 1;
}

.link-graph {
	width: 100%;
	height: 100%;
	display: block;
}

.graph-tooltip {
	position: absolute;
	pointer-events: none;
	z-index: 10;
	background: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
	padding: 0.5rem 0.75rem;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	font-size: 0.875rem;
	max-width: 280px;
}

.graph-tooltip-title {
	font-weight: 600;
	color: var(--color-emphasized);
	margin-bottom: 0.25rem;
	word-break: break-word;
}

.graph-tooltip-badge {
	font-size: 0.75rem;
	color: var(--color-progressive);
	margin-bottom: 0.25rem;
}

.graph-tooltip-stats {
	font-size: 0.8125rem;
	color: var(--color-subtle);
	display: flex;
	gap: 1rem;
}

.graph-tooltip-list {
	font-size: 0.8125rem;
	color: var(--color-subtle);
	margin-top: 0.35rem;
	word-break: break-word;
}

.graph-tooltip-label {
	display: block;
	font-weight: 600;
	color: var(--color-base);
	margin-bottom: 0.15rem;
}

/* Hover highlight: connected nodes and links (D3-created DOM needs :deep for scoped) */
:deep(.node.node-highlight-self circle) {
	stroke: var(--color-progressive);
	stroke-width: 3;
}
:deep(.node.node-highlight-self.node-query circle) {
	stroke: #000;
}
:deep(.node.node-highlight circle) {
	fill: var(--color-progressive);
}
:deep(line.link-highlight) {
	stroke: var(--color-progressive);
}
</style>
