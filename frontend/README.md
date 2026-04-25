# BlomVZ — Frontend

React frontend for BlomVZ. Renders the neural graph, file inspector, and AI question bar.

---

## Stack

- React 18 (Create React App)
- Canvas API — graph renderer
- No UI library — everything custom

---

## Getting Started

```bash
npm install
npm start
```

Opens at http://localhost:3000

Make sure the backend is running at http://localhost:8000 before using the app.

---

## Structure

```
src/
├── api/
│   └── client.js        — all backend API calls in one place
├── components/
│   ├── DropZone.js      — repo input (local path, zip upload, git url)
│   ├── NeuralGraph.js   — canvas graph with force layout and particles
│   ├── NodePanel.js     — file inspector panel (right side)
│   └── AskBar.js        — AI question input and answer display
├── App.js               — main layout, holds all state
├── index.js             — entry point
└── index.css            — global reset and animations
```

---

## How it works

**DropZone** — three ways to load a repo: paste a local path, upload a zip, or paste a git URL. Calls the backend and gets back a graph.

**NeuralGraph** — renders nodes and edges on a canvas. Uses a force-directed layout algorithm — nodes repel each other, edges pull connected nodes together. Particles flow along edges showing dependency direction. Click a node to select it.

**NodePanel** — shows details for the selected node: file path, language, type, line count, complexity score, exports, what it imports, and what imports it. Every dependency is clickable.

**AskBar** — type any question about the codebase. Sends it to the backend AI endpoint. Answer appears above the bar, relevant files get highlighted on the graph with a yellow ring.

---

## Connecting to backend

All API calls are in `src/api/client.js`. Backend URL is hardcoded to `http://localhost:8000`. Change it there if your backend runs on a different port or host.