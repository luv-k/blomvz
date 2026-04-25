export default function NodePanel({ node, graph, onSelectNode }) {

  if (!node) return (
    <div style={styles.root}>
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>⬡</span>
        <span>Click a node to inspect</span>
      </div>
    </div>
  );

  const col = TYPE_COLORS[node.type] ?? TYPE_COLORS.unknown;

  // Files that this node imports
  const dependencies = node.imports
    .map(id => graph.nodes.find(n => n.id === id))
    .filter(Boolean);

  // Files that import this node
  const dependents = graph.nodes.filter(n =>
    n.imports.includes(node.id)
  );

  return (
    <div style={styles.root}>

      {/* ── FILE NAME ── */}
      <div style={styles.header}>
        <div style={{ ...styles.typeDot, background: col.border }} />
        <div>
          <div style={styles.fileName}>{node.name}</div>
          <div style={styles.filePath}>{node.path}</div>
        </div>
      </div>

      <div style={styles.body}>

        {/* ── META ── */}
        <div style={styles.section}>
          <Row label="type"       value={node.type}       color={col.text} />
          <Row label="language"   value={node.language} />
          <Row label="lines"      value={node.lines} />
          <Row label="complexity" value={node.complexity} />
        </div>

        <Divider />

        {/* ── EXPORTS ── */}
        {node.exports?.length > 0 && (
          <>
            <div style={styles.sectionLabel}>exports</div>
            <div style={styles.chipWrap}>
              {node.exports.map(e => (
                <code key={e} style={styles.exportChip}>{e}</code>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* ── DEPENDS ON ── */}
        <div style={styles.sectionLabel}>depends on</div>
        {dependencies.length === 0
          ? <div style={styles.none}>none</div>
          : dependencies.map(dep => (
            <NodeChip key={dep.id} node={dep} onClick={() => onSelectNode(dep.id)} />
          ))
        }

        <Divider />

        {/* ── USED BY ── */}
        <div style={styles.sectionLabel}>used by</div>
        {dependents.length === 0
          ? <div style={styles.none}>nothing imports this</div>
          : dependents.map(dep => (
            <NodeChip key={dep.id} node={dep} onClick={() => onSelectNode(dep.id)} />
          ))
        }

      </div>
    </div>
  );
}

// ── SUB COMPONENTS ────────────────────────────────────────────────────────────

function Row({ label, value, color }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, ...(color ? { color } : {}) }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function NodeChip({ node, onClick }) {
  const col = TYPE_COLORS[node.type] ?? TYPE_COLORS.unknown;
  return (
    <div style={styles.nodeChip} onClick={onClick}>
      <div style={{ ...styles.chipDot, background: col.border }} />
      <span style={styles.chipName}>{node.name}</span>
      <span style={styles.chipType}>{node.type}</span>
    </div>
  );
}

// ── COLORS ────────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  service:   { border: "#378ADD", text: "#7EC8F8" },
  component: { border: "#1D9E75", text: "#5DCAA5" },
  config:    { border: "#D85A30", text: "#F0997B" },
  util:      { border: "#7F77DD", text: "#AFA9EC" },
  type:      { border: "#888780", text: "#B4B2A9" },
  test:      { border: "#3fb950", text: "#56d364" },
  unknown:   { border: "#444",    text: "#888"    },
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    width:       260,
    minWidth:    260,
    borderLeft:  "1px solid #1e2532",
    background:  "#0a0c10",
    display:     "flex",
    flexDirection: "column",
    overflow:    "hidden",
    fontFamily:  '"Fira Code", monospace',
  },
  empty: {
    flex:           1,
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            10,
    fontSize:       11,
    color:          "#30363d",
  },
  emptyIcon: {
    fontSize: 28,
    color:    "#1e2532",
  },
  header: {
    padding:     "14px 14px 10px",
    borderBottom:"1px solid #1e2532",
    display:     "flex",
    gap:         10,
    alignItems:  "flex-start",
  },
  typeDot: {
    width:        8,
    height:       8,
    borderRadius: "50%",
    marginTop:    4,
    flexShrink:   0,
  },
  fileName: {
    fontSize:   12,
    fontWeight: 600,
    color:      "#e6edf3",
    wordBreak:  "break-all",
  },
  filePath: {
    fontSize:  10,
    color:     "#8b949e",
    marginTop: 2,
    wordBreak: "break-all",
  },
  body: {
    flex:      1,
    overflowY: "auto",
    padding:   "10px 14px",
  },
  section: {
    display:       "flex",
    flexDirection: "column",
    gap:           5,
    marginBottom:  8,
  },
  sectionLabel: {
    fontSize:      9,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    color:         "#8b949e",
    marginBottom:  6,
  },
  row: {
    display:       "flex",
    justifyContent:"space-between",
    fontSize:      11,
    gap:           8,
  },
  rowLabel: {
    color: "#8b949e",
  },
  rowValue: {
    color:     "#c9d1d9",
    textAlign: "right",
  },
  divider: {
    height:     1,
    background: "#1e2532",
    margin:     "10px 0",
  },
  chipWrap: {
    display:   "flex",
    flexWrap:  "wrap",
    gap:       4,
    marginBottom: 4,
  },
  exportChip: {
    fontSize:     9,
    padding:      "2px 6px",
    background:   "#161b22",
    border:       "1px solid #21262d",
    borderRadius: 4,
    color:        "#c9d1d9",
  },
  none: {
    fontSize: 11,
    color:    "#30363d",
    marginBottom: 4,
  },
  nodeChip: {
    display:      "flex",
    alignItems:   "center",
    gap:          7,
    padding:      "5px 8px",
    background:   "#0d1117",
    border:       "1px solid #1e2532",
    borderRadius: 6,
    cursor:       "pointer",
    marginBottom: 4,
    transition:   "border-color .15s",
  },
  chipDot: {
    width:        6,
    height:       6,
    borderRadius: "50%",
    flexShrink:   0,
  },
  chipName: {
    fontSize: 11,
    color:    "#c9d1d9",
    flex:     1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace:   "nowrap",
  },
  chipType: {
    fontSize: 9,
    color:    "#8b949e",
  },
};