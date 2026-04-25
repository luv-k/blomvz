import os
import json
import datetime
import aiosqlite
from pathlib import Path
from typing import Optional, List

from ..models.graph import CodeGraph, FileNode, Edge, NodeType, EdgeType

DB_PATH = Path(os.getenv("DB_PATH", "./codebase.db"))


# ── SETUP ─────────────────────────────────────────────────────────────────────

async def init_db():
    """Create tables if they don't exist. Call once on app startup."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS repos (
                id          TEXT PRIMARY KEY,
                path        TEXT NOT NULL,
                indexed_at  TEXT NOT NULL,
                stats       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS files (
                id          TEXT NOT NULL,
                repo_id     TEXT NOT NULL,
                path        TEXT NOT NULL,
                language    TEXT NOT NULL,
                type        TEXT NOT NULL,
                exports     TEXT NOT NULL,
                imports     TEXT NOT NULL,
                lines       INTEGER NOT NULL,
                complexity  INTEGER NOT NULL,
                PRIMARY KEY (id, repo_id),
                FOREIGN KEY (repo_id) REFERENCES repos(id)
            );

            CREATE TABLE IF NOT EXISTS edges (
                id        TEXT NOT NULL,
                repo_id   TEXT NOT NULL,
                source    TEXT NOT NULL,
                target    TEXT NOT NULL,
                type      TEXT NOT NULL,
                label     TEXT,
                PRIMARY KEY (id, repo_id),
                FOREIGN KEY (repo_id) REFERENCES repos(id)
            );
        """)
        await db.commit()


# ── SAVE ──────────────────────────────────────────────────────────────────────

async def save_graph(repo_id: str, repo_path: str, graph: CodeGraph):
    """
    Persist a CodeGraph to SQLite.
    Replaces any existing data for the same repo_id.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Delete old data for this repo
        await db.execute("DELETE FROM edges WHERE repo_id = ?", (repo_id,))
        await db.execute("DELETE FROM files WHERE repo_id = ?", (repo_id,))
        await db.execute("DELETE FROM repos  WHERE id      = ?", (repo_id,))

        # Insert repo record
        await db.execute(
            "INSERT INTO repos (id, path, indexed_at, stats) VALUES (?, ?, ?, ?)",
            (
                repo_id,
                repo_path,
                datetime.datetime.utcnow().isoformat(),
                json.dumps(graph.stats),
            )
        )

        # Insert file nodes
        for node in graph.nodes.values():
            await db.execute(
                """INSERT INTO files
                   (id, repo_id, path, language, type, exports, imports, lines, complexity)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    node.id,
                    repo_id,
                    node.path,
                    node.language,
                    node.type.value,
                    json.dumps(node.exports),
                    json.dumps(node.imports),
                    node.lines,
                    node.complexity,
                )
            )

        # Insert edges
        for edge in graph.edges:
            await db.execute(
                """INSERT INTO edges (id, repo_id, source, target, type, label)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    edge.id,
                    repo_id,
                    edge.source,
                    edge.target,
                    edge.type.value,
                    edge.label,
                )
            )

        await db.commit()


# ── LOAD ──────────────────────────────────────────────────────────────────────

async def load_graph(repo_id: str) -> Optional[CodeGraph]:
    """
    Load a previously indexed CodeGraph from SQLite.
    Returns None if repo_id not found.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Check repo exists
        async with db.execute(
            "SELECT * FROM repos WHERE id = ?", (repo_id,)
        ) as cursor:
            repo_row = await cursor.fetchone()

        if not repo_row:
            return None

        # Load nodes
        nodes = {}
        async with db.execute(
            "SELECT * FROM files WHERE repo_id = ?", (repo_id,)
        ) as cursor:
            async for row in cursor:
                node = FileNode(
                    id=row["id"],
                    path=row["path"],
                    language=row["language"],
                    type=NodeType(row["type"]),
                    exports=json.loads(row["exports"]),
                    imports=json.loads(row["imports"]),
                    lines=row["lines"],
                    complexity=row["complexity"],
                )
                nodes[node.id] = node

        # Load edges
        edges = []
        async with db.execute(
            "SELECT * FROM edges WHERE repo_id = ?", (repo_id,)
        ) as cursor:
            async for row in cursor:
                edges.append(Edge(
                    id=row["id"],
                    source=row["source"],
                    target=row["target"],
                    type=EdgeType(row["type"]),
                    label=row["label"] or "",
                ))

        return CodeGraph(
            nodes=nodes,
            edges=edges,
            stats=json.loads(repo_row["stats"]),
        )


# ── LIST / DELETE ─────────────────────────────────────────────────────────────

async def list_repos() -> List[dict]:
    """Return all indexed repos with basic stats."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, path, indexed_at, stats FROM repos ORDER BY indexed_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()

    return [
        {
            "id":         row["id"],
            "path":       row["path"],
            "indexed_at": row["indexed_at"],
            "stats":      json.loads(row["stats"]),
        }
        for row in rows
    ]


async def delete_repo(repo_id: str):
    """Delete a repo and all its files/edges from the DB."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM edges WHERE repo_id = ?", (repo_id,))
        await db.execute("DELETE FROM files WHERE repo_id = ?", (repo_id,))
        await db.execute("DELETE FROM repos  WHERE id      = ?", (repo_id,))
        await db.commit()


# ── REPO ID HELPER ────────────────────────────────────────────────────────────

def make_repo_id(repo_path: str) -> str:
    """
    Generate a stable repo ID from its path.
    e.g. /home/user/my-project  →  my-project
    """
    return Path(repo_path).resolve().name