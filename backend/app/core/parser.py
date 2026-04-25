import os
import ast
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ..models.graph import CodeGraph, FileNode, Edge, NodeType, EdgeType
from ..utils.file_reader import read_file_safe
from ..utils.language_detector import detect_language
from ..utils.path_resolver import resolve_import_path, get_file_id

# ── SKIP LIST ─────────────────────────────────────────────────────────────────
SKIP_DIRS = {
    'node_modules', '__pycache__', '.git', 'dist', 'build',
    'venv', '.venv', 'env', '.env', '.next', '.nuxt',
    'coverage', '.pytest_cache', '.mypy_cache', 'eggs',
    '.eggs', 'htmlcov', '.tox'
}

SUPPORTED_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx',
    '.java', '.go', '.rs', '.cs'
}

# ── NODE TYPE INFERENCE ───────────────────────────────────────────────────────

def _infer_node_type(path: str, content: str) -> NodeType:
    lower = path.lower()

    if re.search(r'\.(test|spec)\.(py|js|ts|jsx|tsx)$', lower):
        return NodeType.TEST

    if re.search(r'(config|setting|\.config\.|\.env|vite\.|webpack\.|babel\.|jest\.)', lower):
        return NodeType.CONFIG

    if re.search(r'\.(tsx|jsx)$', lower) or re.search(r'/(components|pages|views|ui)/', lower):
        return NodeType.COMPONENT

    if re.search(r'(service|svc|controller|handler|router|route|api|store|hook|use[A-Z])', lower):
        return NodeType.SERVICE

    if re.search(r'(util|helper|lib|common|shared|format|parse|transform|validate)', lower):
        return NodeType.UTIL

    if re.search(r'(type|interface|model|schema|dto|entity|enum)', lower):
        return NodeType.TYPE

    # Content-based fallback
    if 'React' in content or 'render(' in content:
        return NodeType.COMPONENT

    return NodeType.UNKNOWN


# ── COMPLEXITY SCORING ────────────────────────────────────────────────────────
def _score_complexity(content: str) -> int:
    keywords = re.findall(
        r'\b(if|else|elif|for|while|switch|case|catch|try|except|'
        r'async|await|lambda|yield|class|def|function)\b',
        content
    )
    lines = content.count('\n')
    return len(keywords) * 2 + lines // 10


# ── PYTHON PARSING ────────────────────────────────────────────────────────────
def _parse_python_imports(tree: ast.AST) -> List[Tuple[str, int]]:
    """
    Returns list of (module_string, relative_level) tuples.
    Level 0 = absolute, 1 = '.', 2 = '..' etc.
    """
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append((alias.name, 0))
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ''
            level = node.level or 0
            imports.append((module, level))
    return imports


def _parse_python_exports(tree: ast.AST, content: str) -> List[str]:
    exports = []

    # __all__ list
    all_match = re.search(r'__all__\s*=\s*\[([^\]]+)\]', content)
    if all_match:
        names = re.findall(r'[\'"](\w+)[\'"]', all_match.group(1))
        exports.extend(names)

    # Top-level def and class (non-private)
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if not node.name.startswith('_'):
                exports.append(node.name)

    return list(set(exports))


def _parse_python(file_path: Path, content: str) -> Tuple[List[str], List[str], int]:
    """Returns (raw_import_strings, exports, complexity)"""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return [], [], _score_complexity(content)

    raw_imports = []
    for module, level in _parse_python_imports(tree):
        if level > 0:
            prefix = '.' * level
            raw_imports.append(f"{prefix}{module}" if module else prefix)
        else:
            raw_imports.append(module)

    exports = _parse_python_exports(tree, content)
    complexity = _score_complexity(content)

    return raw_imports, exports, complexity


# ── JS / TS PARSING ───────────────────────────────────────────────────────────
def _parse_js_imports(content: str) -> List[str]:
    imports = []

    # import x from '...'  /  import '...'  /  import type x from '...'
    for m in re.finditer(
        r'import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?[\'"]([^\'"]+)[\'"]',
        content
    ):
        imports.append(m.group(1))

    # require('...')
    for m in re.finditer(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content):
        imports.append(m.group(1))

    # dynamic import('...')
    for m in re.finditer(r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content):
        imports.append(m.group(1))

    return list(set(imports))


def _parse_js_exports(content: str) -> List[str]:
    exports = []

    patterns = [
        r'export\s+(?:default\s+)?(?:async\s+)?(?:function|class)\s+(\w+)',
        r'export\s+(?:const|let|var|type|interface|enum)\s+(\w+)',
        r'exports\.(\w+)\s*=',
    ]

    for pat in patterns:
        for m in re.finditer(pat, content):
            exports.append(m.group(1))

    # module.exports = { a, b, c }
    me = re.search(r'module\.exports\s*=\s*\{([^}]+)\}', content)
    if me:
        names = re.findall(r'\b(\w+)\b', me.group(1))
        exports.extend(names)

    return list(set(exports))


def _parse_js(content: str) -> Tuple[List[str], List[str], int]:
    raw_imports = _parse_js_imports(content)
    exports = _parse_js_exports(content)
    complexity = _score_complexity(content)
    return raw_imports, exports, complexity


# ── IMPORT RESOLUTION ─────────────────────────────────────────────────────────
def _resolve_imports(
    raw_imports: List[str],
    current_file: Path,
    repo_root: Path,
    all_file_ids: set
) -> List[str]:
    """
    Turns raw import strings into file IDs that exist in all_file_ids.
    Only resolves relative imports (starting with . ) and local absolute imports.
    """
    resolved = []

    for raw in raw_imports:
        result = resolve_import_path(raw, current_file, repo_root)
        if result:
            file_id = get_file_id(Path(result), repo_root)
            if file_id in all_file_ids:
                resolved.append(file_id)

    return list(set(resolved))


# ── MAIN PARSER CLASS ─────────────────────────────────────────────────────────
class CodeParser:
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).resolve()

    def parse_repository(self) -> CodeGraph:
        """
        Walk the repository, parse every supported file,
        resolve imports into edges, and return a CodeGraph.
        """
        raw_files: Dict[str, dict] = {}

        # ── Pass 1: parse every file individually ──────────────────────────
        for root, dirs, files in os.walk(self.repo_path):
            # Prune skip dirs in-place
            dirs[:] = [
                d for d in dirs
                if d not in SKIP_DIRS and not d.startswith('.')
            ]

            for filename in files:
                file_path = Path(root) / filename

                if file_path.suffix not in SUPPORTED_EXTENSIONS:
                    continue

                content = read_file_safe(file_path)
                if content is None:
                    continue

                file_id = get_file_id(file_path, self.repo_path)
                language = detect_language(file_path, content)
                node_type = _infer_node_type(str(file_path), content)
                lines = content.count('\n') + 1

                if file_path.suffix == '.py':
                    raw_imports, exports, complexity = _parse_python(file_path, content)
                elif file_path.suffix in {'.js', '.ts', '.jsx', '.tsx'}:
                    raw_imports, exports, complexity = _parse_js(content)
                else:
                    raw_imports, exports, complexity = [], [], _score_complexity(content)

                raw_files[file_id] = {
                    'path': str(file_path.relative_to(self.repo_path)),
                    'language': language,
                    'node_type': node_type,
                    'lines': lines,
                    'complexity': complexity,
                    'exports': exports,
                    'raw_imports': raw_imports,
                    'file_path': file_path,
                }

        all_file_ids = set(raw_files.keys())

        # ── Pass 2: resolve imports → edges ───────────────────────────────
        code_graph = CodeGraph(nodes={}, edges=[], stats={})

        for file_id, info in raw_files.items():
            resolved_imports = _resolve_imports(
                info['raw_imports'],
                info['file_path'],
                self.repo_path,
                all_file_ids
            )

            node = FileNode(
                id=file_id,
                path=info['path'],
                language=info['language'],
                type=info['node_type'],
                exports=info['exports'],
                imports=resolved_imports,
                lines=info['lines'],
                complexity=info['complexity'],
                content=""
            )
            code_graph.add_node(node)

            for target_id in resolved_imports:
                edge = Edge(
                    id=f"{file_id}->{target_id}",
                    source=file_id,
                    target=target_id,
                    type=EdgeType.IMPORTS,
                    label="imports"
                )
                code_graph.add_edge(edge)

        # ── Stats ──────────────────────────────────────────────────────────
        lang_counts: Dict[str, int] = {}
        for node in code_graph.nodes.values():
            lang_counts[node.language] = lang_counts.get(node.language, 0) + 1

        code_graph.stats = {
            "total_files": len(code_graph.nodes),
            "total_edges": len(code_graph.edges),
            "total_lines": sum(n.lines for n in code_graph.nodes.values()),
            "languages": lang_counts,
            "indexed_at": str(__import__('datetime').datetime.utcnow()),
        }

        return code_graph