from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


# ── ENUMS ─────────────────────────────────────────────────────────────────────

class NodeType(Enum):
    SERVICE   = "service"    # API routes, controllers, handlers, stores
    COMPONENT = "component"  # React/Vue components, pages, views
    CONFIG    = "config"     # Config files, env, settings
    UTIL      = "util"       # Helpers, utils, libs, formatters
    TYPE      = "type"       # Models, schemas, interfaces, DTOs, enums
    TEST      = "test"       # Test and spec files
    UNKNOWN   = "unknown"    # Fallback


class EdgeType(Enum):
    IMPORTS    = "imports"
    EXTENDS    = "extends"
    IMPLEMENTS = "implements"
    CALLS      = "calls"


# ── NODES ─────────────────────────────────────────────────────────────────────

@dataclass
class FileNode:
    id:         str               # unique key — relative path e.g. "app/core/parser.py"
    path:       str               # same as id, kept for clarity
    language:   str               # "python", "typescript", "javascript" etc.
    type:       NodeType          # one of the NodeType values above
    exports:    List[str]         # exported symbols
    imports:    List[str]         # resolved file IDs this file depends on
    lines:      int               # line count
    complexity: int               # complexity score
    content:    str = ""          # raw content, optional (not stored by default)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id":         self.id,
            "path":       self.path,
            "language":   self.language,
            "type":       self.type.value,
            "exports":    self.exports,
            "imports":    self.imports,
            "lines":      self.lines,
            "complexity": self.complexity,
        }


# ── EDGES ─────────────────────────────────────────────────────────────────────

@dataclass
class Edge:
    id:     str       # unique key e.g. "a.py->b.py"
    source: str       # file ID
    target: str       # file ID
    type:   EdgeType
    label:  str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id":     self.id,
            "source": self.source,
            "target": self.target,
            "type":   self.type.value,
            "label":  self.label,
        }


# ── GRAPH ─────────────────────────────────────────────────────────────────────

@dataclass
class CodeGraph:
    nodes: Dict[str, FileNode] = field(default_factory=dict)
    edges: List[Edge]          = field(default_factory=list)
    stats: Dict[str, Any]      = field(default_factory=dict)

    def add_node(self, node: FileNode):
        self.nodes[node.id] = node

    def add_edge(self, edge: Edge):
        # No duplicate edges
        if not any(e.id == edge.id for e in self.edges):
            self.edges.append(edge)

    def get_node(self, node_id: str) -> Optional[FileNode]:
        return self.nodes.get(node_id)

    def get_node_by_path(self, path: str) -> Optional[FileNode]:
        return next((n for n in self.nodes.values() if n.path == path), None)

    def get_edges_for_node(self, node_id: str) -> List[Edge]:
        return [e for e in self.edges if e.source == node_id or e.target == node_id]

    def get_dependencies(self, node_id: str) -> List[FileNode]:
        """Files that node_id imports."""
        targets = [e.target for e in self.edges if e.source == node_id]
        return [self.nodes[t] for t in targets if t in self.nodes]

    def get_dependents(self, node_id: str) -> List[FileNode]:
        """Files that import node_id."""
        sources = [e.source for e in self.edges if e.target == node_id]
        return [self.nodes[s] for s in sources if s in self.nodes]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
            "stats": self.stats,
        }