import { useEffect, useRef, useCallback } from "react";

// ── COLORS PER NODE TYPE ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  service:   { bg: "#1a2a3a", border: "#378ADD", text: "#7EC8F8", glow: "rgba(55,138,221,0.4)"  },
  component: { bg: "#0d2a1e", border: "#1D9E75", text: "#5DCAA5", glow: "rgba(29,158,117,0.4)"  },
  config:    { bg: "#2a1a0d", border: "#D85A30", text: "#F0997B", glow: "rgba(216,90,48,0.4)"   },
  util:      { bg: "#1e1a2e", border: "#7F77DD", text: "#AFA9EC", glow: "rgba(127,119,221,0.4)" },
  type:      { bg: "#1e1e1e", border: "#888780", text: "#B4B2A9", glow: "rgba(136,135,128,0.3)" },
  test:      { bg: "#1a2a1a", border: "#3fb950", text: "#56d364", glow: "rgba(63,185,80,0.3)"   },
  unknown:   { bg: "#1a1a1a", border: "#444",    text: "#888",    glow: "rgba(100,100,100,0.2)" },
};

function getColor(type) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.unknown;
}

// ── FORCE LAYOUT ─────────────────────────────────────────────────────────────
function forceLayout(nodes, edges, W, H) {
  if (!nodes.length) return [];

  const positions = nodes.map((n, i) => ({
    id:  n.id,
    x:   W / 2 + Math.cos((i / nodes.length) * Math.PI * 2) * (W * 0.28),
    y:   H / 2 + Math.sin((i / nodes.length) * Math.PI * 2) * (H * 0.28),
    vx:  0,
    vy:  0,
  }));

  const posMap = {};
  positions.forEach(p => { posMap[p.id] = p; });

  for (let iter = 0; iter < 160; iter++) {
    const cool = 1 - iter / 160;

    // Repulsion between all nodes
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (4000 / (dist * dist)) * cool;
        a.vx += (dx / dist) * force; a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force;
      }
    }

    // Attraction along edges
    edges.forEach(e => {
      const a = posMap[e.source], b = posMap[e.target];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const ideal = 160;
      const force = ((dist - ideal) / dist) * 0.05 * cool;
      a.vx += dx * force; a.vy += dy * force;
      b.vx -= dx * force; b.vy -= dy * force;
    });

    // Center gravity
    positions.forEach(p => {
      p.vx += (W / 2 - p.x) * 0.006 * cool;
      p.vy += (H / 2 - p.y) * 0.006 * cool;
      p.x  += p.vx * 0.5;
      p.y  += p.vy * 0.5;
      p.vx *= 0.8; p.vy *= 0.8;
      p.x = Math.max(40, Math.min(W - 40, p.x));
      p.y = Math.max(40, Math.min(H - 40, p.y));
    });
  }

  return positions;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function NeuralGraph({
  nodes, edges,
  selectedNode, hoveredNode,
  onSelect, onHover,
  aiFiles,
}) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({ positions: [], particles: [], frame: 0 });
  const animRef    = useRef(null);

  // ── LAYOUT on nodes/edges change ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    const positions = forceLayout(nodes, edges, W, H);
    const posMap = {};
    positions.forEach(p => { posMap[p.id] = p; });

    // Seed particles on edges
    const particles = [];
    edges.forEach(e => {
      if (Math.random() > 0.5) {
        particles.push({ from: e.source, to: e.target, t: Math.random(), speed: 0.003 + Math.random() * 0.004 });
      }
    });

    stateRef.current = { positions, posMap, particles, frame: 0 };
  }, [nodes, edges]);

  // ── DRAW LOOP ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { positions, posMap, particles } = stateRef.current;
    if (!positions.length) return;

    const W = canvas.width, H = canvas.height;
    stateRef.current.frame++;
    const frame = stateRef.current.frame;

    ctx.clearRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.018)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // ── Edges ──
    edges.forEach(e => {
      const a = posMap[e.source], b = posMap[e.target];
      if (!a || !b) return;

      const isActive = selectedNode && (selectedNode.id === e.source || selectedNode.id === e.target);
      const isAI     = aiFiles.includes(e.source) || aiFiles.includes(e.target);
      const srcNode  = nodes.find(n => n.id === e.source);
      const col      = getColor(srcNode?.type);

      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.1;
      const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.1;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);

      if (isAI) {
        ctx.strokeStyle = "#f0e060";
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = 0.8;
      } else if (isActive) {
        ctx.strokeStyle = col.border;
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = 0.9;
      } else if (selectedNode) {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth   = 0.5;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = col.border + "44";
        ctx.lineWidth   = 0.75;
        ctx.globalAlpha = 0.7;
      }

      ctx.setLineDash(isActive || isAI ? [] : [3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    // ── Particles ──
    particles.forEach(p => {
      const a = posMap[p.from], b = posMap[p.to];
      if (!a || !b) return;

      p.t += p.speed;
      if (p.t > 1) p.t = 0;

      const t  = p.t;
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.1;
      const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.1;
      const px = (1-t)*(1-t)*a.x + 2*(1-t)*t*mx + t*t*b.x;
      const py = (1-t)*(1-t)*a.y + 2*(1-t)*t*my + t*t*b.y;

      const srcNode = nodes.find(n => n.id === p.from);
      const col     = getColor(srcNode?.type);
      const isActive = !selectedNode || selectedNode.id === p.from || selectedNode.id === p.to;

      if (isActive) {
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle  = col.text;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // ── Nodes ──
    nodes.forEach(n => {
      const pos = posMap[n.id];
      if (!pos) return;

      const col        = getColor(n.type);
      const isSelected = selectedNode?.id === n.id;
      const isHovered  = hoveredNode?.id  === n.id;
      const isAI       = aiFiles.includes(n.id);
      const isDimmed   = selectedNode && !isSelected &&
        !edges.some(e => (e.source === selectedNode.id && e.target === n.id) ||
                         (e.target === selectedNode.id && e.source === n.id));

      const r = isSelected ? 26 : isHovered ? 24 : 20;
      ctx.globalAlpha = isDimmed ? 0.18 : 1;

      // AI highlight ring
      if (isAI) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = "#f0e060";
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = isDimmed ? 0.18 : 1;
      }

      // Glow
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 14, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + 14);
        grd.addColorStop(0, col.glow);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Pulse ring for selected
      if (isSelected) {
        const pulse = (Math.sin(frame * 0.05) + 1) / 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 7 + pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = col.border;
        ctx.lineWidth   = 0.8;
        ctx.globalAlpha = (1 - pulse) * 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Node fill
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle   = col.bg;
      ctx.globalAlpha = isDimmed ? 0.18 : 1;
      ctx.fill();
      ctx.strokeStyle = col.border;
      ctx.lineWidth   = isSelected ? 2 : 1;
      ctx.stroke();

      // Label
      ctx.fillStyle      = col.text;
      ctx.font           = `${isSelected ? "600" : "500"} 10px "Fira Code", monospace`;
      ctx.textAlign      = "center";
      ctx.textBaseline   = "middle";
        const short = (n.name || n.id.split("/").pop() || n.id)
        .replace(/\.(ts|tsx|js|jsx|py|go|rs)$/, "")
        .replace(/\.(service|config|util|client|controller)$/, "");
      ctx.fillText(short.length > 10 ? short.slice(0, 9) + "…" : short, pos.x, pos.y);

      ctx.globalAlpha = 1;
    });

    animRef.current = requestAnimationFrame(draw);
  }, [nodes, edges, selectedNode, hoveredNode, aiFiles]);

  // Start/restart animation loop
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── RESIZE ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current;
      if (!canvas || !nodes.length) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const positions = forceLayout(nodes, edges, canvas.width, canvas.height);
      const posMap = {};
      positions.forEach(p => { posMap[p.id] = p; });
      stateRef.current.positions = positions;
      stateRef.current.posMap    = posMap;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [nodes, edges]);

  // ── MOUSE ─────────────────────────────────────────────────────────────────
  function nodeAt(x, y) {
    const { posMap } = stateRef.current;
    if (!posMap) return null;
    return nodes.find(n => {
      const p = posMap[n.id];
      return p && Math.hypot(p.x - x, p.y - y) < 26;
    });
  }

  function handleClick(e) {
    const r   = canvasRef.current.getBoundingClientRect();
    const hit = nodeAt(e.clientX - r.left, e.clientY - r.top);
    onSelect(hit ?? null);
  }

  function handleMove(e) {
    const r   = canvasRef.current.getBoundingClientRect();
    const hit = nodeAt(e.clientX - r.left, e.clientY - r.top);
    onHover(hit ?? null);
    canvasRef.current.style.cursor = hit ? "pointer" : "crosshair";
  }

  // ── LEGEND ────────────────────────────────────────────────────────────────
  const legendItems = Object.entries(TYPE_COLORS).filter(([k]) => k !== "unknown");

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0d1117" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => onHover(null)}
      />
      {/* Legend */}
      <div style={styles.legend}>
        {legendItems.map(([type, col]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: col.border }} />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  legend: {
    position:   "absolute",
    bottom:     60,
    left:       12,
    display:    "flex",
    flexDirection: "column",
    gap:        5,
    pointerEvents: "none",
  },
  legendItem: {
    display:    "flex",
    alignItems: "center",
    gap:        6,
    fontSize:   10,
    color:      "rgba(255,255,255,0.35)",
  },
  legendDot: {
    width:        7,
    height:       7,
    borderRadius: "50%",
  },
};