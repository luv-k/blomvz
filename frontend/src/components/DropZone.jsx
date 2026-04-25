import { useState, useRef } from "react";

export default function DropZone({ onLocalPath, onZipUpload, onGitUrl, error }) {
  const [mode, setMode]       = useState("local"); // local | zip | git
  const [path, setPath]       = useState("");
  const [gitUrl, setGitUrl]   = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  function handleSubmitLocal(e) {
    e.preventDefault();
    if (path.trim()) onLocalPath(path.trim());
  }

  function handleSubmitGit(e) {
    e.preventDefault();
    if (gitUrl.trim()) onGitUrl(gitUrl.trim());
  }

  function handleFile(file) {
    if (file && file.name.endsWith(".zip")) onZipUpload(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⬡</span>
          <span style={styles.logoText}>codebase.ai</span>
        </div>
        <p style={styles.sub}>Index any repo. Ask anything. See everything.</p>

        {/* Mode tabs */}
        <div style={styles.tabs}>
          {["local", "zip", "git"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            >
              {m === "local" && "📁 Local Path"}
              {m === "zip"   && "🗜 ZIP Upload"}
              {m === "git"   && "🔗 Git URL"}
            </button>
          ))}
        </div>

        {/* Local path */}
        {mode === "local" && (
          <form onSubmit={handleSubmitLocal} style={styles.form}>
            <input
              style={styles.input}
              placeholder="C:\Users\you\my-project"
              value={path}
              onChange={e => setPath(e.target.value)}
            />
            <button style={styles.btn} type="submit">Index →</button>
          </form>
        )}

        {/* ZIP upload */}
        {mode === "zip" && (
          <div
            style={{ ...styles.dropArea, ...(dragging ? styles.dropAreaActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <span style={styles.dropIcon}>🗜</span>
            <span style={styles.dropText}>
              {dragging ? "Drop it!" : "Drag & drop a .zip or click to browse"}
            </span>
          </div>
        )}

        {/* Git URL */}
        {mode === "git" && (
          <form onSubmit={handleSubmitGit} style={styles.form}>
            <input
              style={styles.input}
              placeholder="https://github.com/user/repo"
              value={gitUrl}
              onChange={e => setGitUrl(e.target.value)}
            />
            <button style={styles.btn} type="submit">Clone & Index →</button>
          </form>
        )}

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Footer hint */}
        <p style={styles.hint}>
          Supports Python · JavaScript · TypeScript · Go · Rust · Java
        </p>

      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0c10",
  },
  card: {
    width: 480,
    background: "#0d1117",
    border: "1px solid #1e2532",
    borderRadius: 12,
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    fontSize: 28,
    color: "#378ADD",
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: "#e6edf3",
    letterSpacing: "-0.03em",
    fontFamily: '"Fira Code", monospace',
  },
  sub: {
    fontSize: 12,
    color: "#8b949e",
    textAlign: "center",
  },
  tabs: {
    display: "flex",
    gap: 6,
    background: "#161b22",
    padding: 4,
    borderRadius: 8,
    width: "100%",
  },
  tab: {
    flex: 1,
    padding: "6px 0",
    fontSize: 11,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#8b949e",
    cursor: "pointer",
    fontFamily: '"Fira Code", monospace',
    transition: "all .15s",
  },
  tabActive: {
    background: "#0d1117",
    color: "#e6edf3",
    border: "1px solid #21262d",
  },
  form: {
    display: "flex",
    gap: 8,
    width: "100%",
  },
  input: {
    flex: 1,
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#c9d1d9",
    fontSize: 12,
    fontFamily: '"Fira Code", monospace',
    outline: "none",
  },
  btn: {
    background: "#1a2a3a",
    border: "1px solid #378ADD55",
    color: "#7EC8F8",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: '"Fira Code", monospace',
    whiteSpace: "nowrap",
  },
  dropArea: {
    width: "100%",
    height: 120,
    border: "1px dashed #21262d",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    transition: "all .15s",
  },
  dropAreaActive: {
    borderColor: "#378ADD",
    background: "#1a2a3a",
  },
  dropIcon: {
    fontSize: 28,
  },
  dropText: {
    fontSize: 12,
    color: "#8b949e",
  },
  error: {
    width: "100%",
    padding: "8px 12px",
    background: "#2d1a1a",
    border: "1px solid #5a1a1a",
    borderRadius: 6,
    fontSize: 11,
    color: "#f85149",
  },
  hint: {
    fontSize: 10,
    color: "#30363d",
    textAlign: "center",
  },
};