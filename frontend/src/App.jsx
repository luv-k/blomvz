import { useState } from "react";
import { parseLocalRepo, parseGitRepo, uploadRepo, askQuestion } from "./api/client";
import DropZone from "./components/DropZone";
import NeuralGraph from "./components/NeuralGraph";
import NodePanel from "./components/NodePanel";
import AskBar from "./components/AskBar";

export default function App() {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [graph, setGraph]             = useState(null);      // { nodes, edges, stats }
  const [selectedNode, setSelectedNode] = useState(null);    // clicked FileNode
  const [hoveredNode, setHoveredNode]   = useState(null);    // hovered FileNode
  const [loading, setLoading]           = useState(false);   // indexing spinner
  const [error, setError]               = useState(null);    // error message
  const [repoPath, setRepoPath]         = useState(null);    // path sent to backend
  const [aiAnswer, setAiAnswer]         = useState(null);    // { answer, relevant_files }
  const [aiLoading, setAiLoading]       = useState(false);   // AI spinner

  // ── INDEX REPO ─────────────────────────────────────────────────────────────
  async function handleLocalPath(path) {
    setLoading(true);
    setError(null);
    setGraph(null);
    setSelectedNode(null);
    setAiAnswer(null);
    try {
      const data = await parseLocalRepo(path);
      setGraph(data.data);
      setRepoPath(path);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleZipUpload(file) {
    setLoading(true);
    setError(null);
    setGraph(null);
    setSelectedNode(null);
    setAiAnswer(null);
    try {
      const data = await uploadRepo(file);
      setGraph(data.data);
      setRepoPath(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGitUrl(url) {
    setLoading(true);
    setError(null);
    setGraph(null);
    setSelectedNode(null);
    setAiAnswer(null);
    try {
      const data = await parseGitRepo(url);
      setGraph(data.data);
      setRepoPath(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── ASK AI ─────────────────────────────────────────────────────────────────
  async function handleAsk(question) {
    if (!repoPath) return;
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const result = await askQuestion(repoPath, question);
      setAiAnswer(result);
      // highlight first relevant file on graph
      if (result.relevant_files?.length > 0) {
        const hit = graph.nodes.find(n => n.path === result.relevant_files[0]);
        if (hit) setSelectedNode(hit);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⬡</span>
          <span style={styles.logoText}>codebase.ai</span>
        </div>
        {graph && (
          <div style={styles.stats}>
            <span style={styles.statChip}>{graph.stats.total_files} files</span>
            <span style={styles.statChip}>{graph.stats.total_edges} edges</span>
            {Object.entries(graph.stats.languages).map(([lang, count]) => (
              <span key={lang} style={styles.statChip}>{lang} {count}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div style={styles.body}>

        {/* ── LEFT: graph or dropzone ── */}
        <div style={styles.graphArea}>
          {!graph && !loading && (
            <DropZone
              onLocalPath={handleLocalPath}
              onZipUpload={handleZipUpload}
              onGitUrl={handleGitUrl}
              error={error}
            />
          )}
          {loading && (
            <div style={styles.center}>
              <div style={styles.spinner} />
              <div style={styles.loadingText}>Indexing codebase...</div>
            </div>
          )}
          {graph && (
            <NeuralGraph
              nodes={graph.nodes}
              edges={graph.edges}
              selectedNode={selectedNode}
              hoveredNode={hoveredNode}
              onSelect={setSelectedNode}
              onHover={setHoveredNode}
              aiFiles={aiAnswer?.relevant_files ?? []}
            />
          )}

          {/* ── AI BAR ── */}
          {graph && (
            <AskBar
              onAsk={handleAsk}
              loading={aiLoading}
              answer={aiAnswer}
            />
          )}
        </div>

        {/* ── RIGHT: node inspector ── */}
        {graph && (
          <NodePanel
            node={selectedNode}
            graph={graph}
            onSelectNode={(id) => {
              const n = graph.nodes.find(n => n.id === id);
              if (n) setSelectedNode(n);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0a0c10",
    color: "#c9d1d9",
    fontFamily: '"Fira Code", "Cascadia Code", monospace',
    overflow: "hidden",
  },
  header: {
    height: 46,
    borderBottom: "1px solid #1e2532",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 16,
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    fontSize: 18,
    color: "#378ADD",
  },
  logoText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#e6edf3",
    letterSpacing: "-0.02em",
  },
  stats: {
    display: "flex",
    gap: 6,
    marginLeft: "auto",
  },
  statChip: {
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 10,
    border: "1px solid #1e2532",
    color: "#8b949e",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  graphArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  center: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "2px solid #1e2532",
    borderTop: "2px solid #378ADD",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontSize: 12,
    color: "#8b949e",
  },
};