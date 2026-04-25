# BlomVZ — Codebase Knowledge AI

BlomVZ is a local-first tool that indexes any code repository and lets you understand it visually and through natural language. You drop in a repo, it builds a graph of every file and how they connect, and you can ask questions like "where is the auth logic?" or "explain the payment flow" — answered by a local AI model running on your GPU.

No data leaves your machine. No API costs. Everything runs locally.

---

## What it does

- Parses your codebase and extracts files, imports, exports, and dependencies
- Builds a live neural-net style graph showing how files connect to each other
- Lets you click any node to inspect its exports, dependencies, and what depends on it
- Answers natural language questions about your code using a local LLM (Qwen2.5-Coder)
- Highlights relevant files on the graph when AI answers a question
- Supports Python, JavaScript, TypeScript, Go, Rust, Java

---

## Architecture

```
Frontend (React)
    ↓ HTTP
Backend (FastAPI)
    ├── Parser       — walks repo, extracts imports/exports, builds graph
    ├── CodeGraph    — nodes (files) + edges (dependencies)
    ├── AI Layer     — local Qwen2.5-Coder-7B via HuggingFace transformers
    └── SQLite DB    — persists indexed repos
```

---

## Requirements

- Python 3.10
- Node.js 18+
- NVIDIA GPU with 6GB+ VRAM
- CUDA 12.1
- Docker (optional)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourname/blomvz
cd blomvz
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install torch==2.5.1+cu121 --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:

```
MODEL_ID=Qwen/Qwen2.5-Coder-7B-Instruct
HF_TOKEN=your_huggingface_token_here
```

Get your HuggingFace token at https://huggingface.co/settings/tokens

Start the backend:

```bash
uvicorn app.main:app --reload
```

On first run the model (~15GB) will download and cache locally. Subsequent starts load from cache.

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

### 4. Index a repo

- Paste a local folder path e.g. `C:\Users\you\my-project`
- Or upload a `.zip` file
- Or paste a Git URL

The graph will render automatically. Click any node to inspect it. Use the ask bar at the bottom to ask questions.

---

## Docker (Backend only)

Build the image:

```bash
cd backend
docker build -t blomvz .
```

Run with GPU and your local cache mounted (no re-download):

```bash
docker run -d --gpus all --name blomvz -p 8000:8000 --env-file .env -v C:\Users\you\.cache\huggingface:/root/.cache/huggingface -v C:\Users\you\Desktop:/workspace blomvz
```

When using Docker, use `/workspace/your-project` as the path instead of `C:\Users\...`

---

## Project Structure

```
blomvz/
├── backend/
│   ├── app/
│   │   ├── main.py              — FastAPI app entry point
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── repository.py — parse endpoints (local, zip, git)
│   │   │       └── ai.py         — ask endpoint
│   │   ├── core/
│   │   │   ├── parser.py        — multi-language AST parser
│   │   │   ├── ai.py            — local LLM wrapper
│   │   │   └── db.py            — SQLite persistence
│   │   ├── models/
│   │   │   └── graph.py         — FileNode, Edge, CodeGraph dataclasses
│   │   └── utils/
│   │       ├── file_reader.py   — safe file reading
│   │       ├── language_detector.py
│   │       └── path_resolver.py — import resolution
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    └── src/
        ├── api/
        │   └── client.js        — backend API calls
        ├── components/
        │   ├── DropZone.js      — repo input
        │   ├── NeuralGraph.js   — canvas graph renderer
        │   ├── NodePanel.js     — file inspector
        │   └── AskBar.js        — AI question bar
        └── App.js               — main layout and state
```

---

## Notes

- The AI model loads into GPU VRAM on first question and stays loaded until the server stops
- Only one question runs at a time — the model is not thread safe
- Context window is set to 4096 tokens — very large repos may get truncated
- Tested on Windows 11 with RTX 4060 6GB VRAM