import { useState } from "react";

export default function AskBar({ onAsk, loading, answer }) {
  const [question, setQuestion] = useState("");
  const [open, setOpen]         = useState(false);

  function handleAsk() {
    if (!question.trim() || loading) return;
    onAsk(question.trim());
    setOpen(true);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div style={styles.root}>

      {/* ── AI ANSWER ── */}
      {open && answer && (
        <div style={styles.answerBox}>
          <div style={styles.answerHeader}>
            <span style={styles.answerLabel}>⬡ AI Answer</span>
            <button style={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div style={styles.answerText}>
            {answer.answer}
          </div>
          {answer.relevant_files?.length > 0 && (
            <div style={styles.relevantWrap}>
              <span style={styles.relevantLabel}>Relevant files:</span>
              {answer.relevant_files.map(f => (
                <code key={f} style={styles.relevantChip}>{f.split("/").pop()}</code>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={styles.bar}>
        <span style={styles.icon}>⬡</span>
        <textarea
          style={styles.input}
          rows={1}
          placeholder='Ask anything — "where is auth handled?" · "explain the payment flow"'
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? "⟳" : "Ask →"}
        </button>
      </div>

    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position:      "absolute",
    bottom:        0,
    left:          0,
    right:         0,
    display:       "flex",
    flexDirection: "column",
    fontFamily:    '"Fira Code", monospace',
  },
  answerBox: {
    margin:        "0 12px 8px",
    background:    "#0d1117",
    border:        "1px solid #1e2532",
    borderRadius:  10,
    padding:       "12px 14px",
    maxHeight:     220,
    overflowY:     "auto",
  },
  answerHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   8,
  },
  answerLabel: {
    fontSize:  10,
    color:     "#1D9E75",
    textTransform: "uppercase",
    letterSpacing: ".07em",
  },
  closeBtn: {
    background:  "transparent",
    border:      "none",
    color:       "#8b949e",
    cursor:      "pointer",
    fontSize:    11,
    fontFamily:  '"Fira Code", monospace',
  },
  answerText: {
    fontSize:   12,
    color:      "#c9d1d9",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  relevantWrap: {
    marginTop:  10,
    display:    "flex",
    flexWrap:   "wrap",
    gap:        4,
    alignItems: "center",
  },
  relevantLabel: {
    fontSize: 10,
    color:    "#8b949e",
  },
  relevantChip: {
    fontSize:     10,
    padding:      "1px 6px",
    background:   "#161b22",
    border:       "1px solid #21262d",
    borderRadius: 4,
    color:        "#7EC8F8",
  },
  bar: {
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    padding:      "8px 12px",
    borderTop:    "1px solid #1e2532",
    background:   "#0a0c10",
  },
  icon: {
    fontSize: 16,
    color:    "#378ADD",
    flexShrink: 0,
  },
  input: {
    flex:        1,
    background:  "#0d1117",
    border:      "1px solid #21262d",
    borderRadius: 8,
    padding:     "7px 10px",
    color:       "#c9d1d9",
    fontSize:    12,
    fontFamily:  '"Fira Code", monospace',
    outline:     "none",
    resize:      "none",
    lineHeight:  1.5,
  },
  btn: {
    background:  "#1a2a3a",
    border:      "1px solid #378ADD55",
    color:       "#7EC8F8",
    borderRadius: 8,
    padding:     "7px 16px",
    fontSize:    12,
    cursor:      "pointer",
    fontFamily:  '"Fira Code", monospace',
    fontWeight:  600,
    whiteSpace:  "nowrap",
    flexShrink:  0,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor:  "default",
  },
};