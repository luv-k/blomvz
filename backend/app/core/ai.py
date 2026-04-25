import os
import torch
from pathlib import Path
from typing import Dict, List, Optional
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from ..models.graph import CodeGraph, FileNode
from ..utils.file_reader import read_file_safe

MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen2.5-Coder-7B-Instruct")

class CodebaseAI:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        from huggingface_hub import login
        token = os.getenv("HF_TOKEN")
        if token:
            login(token=token)
        print(f"Loading model: {MODEL_ID}")

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )

        self.tokenizer = AutoTokenizer.from_pretrained(
            MODEL_ID,
            trust_remote_code=True
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            quantization_config=bnb_config,
            device_map="cuda",
            trust_remote_code=True
        )

        self.model.eval()
        print("Model loaded successfully on CUDA.")

    def ask_question(self, code_graph: CodeGraph, question: str, repo_path: str) -> Dict:
        prompt = self._build_prompt(code_graph, question, repo_path)

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=4096
        ).to("cuda")

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.2,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # Decode only the new tokens
        generated = output[0][inputs["input_ids"].shape[1]:]
        answer = self.tokenizer.decode(generated, skip_special_tokens=True).strip()

        relevant_files = self._extract_relevant_files(answer, code_graph)

        return {
            "answer": answer,
            "relevant_files": relevant_files
        }

    def _build_prompt(self, code_graph: CodeGraph, question: str, repo_path: str) -> str:
        graph_summary = self._get_graph_summary(code_graph)
        relevant_files = self._find_relevant_files(question, code_graph)
        file_contents = self._get_file_contents(relevant_files, repo_path)

        return f"""You are an expert software engineer analyzing a codebase. Answer the question below based on the codebase structure and file contents provided.

{graph_summary}

{file_contents}

Question: {question}

Answer:"""

    def _get_graph_summary(self, code_graph: CodeGraph) -> str:
        lines = [
            "=== Codebase Overview ===",
            f"Total Files: {code_graph.stats.get('total_files', 0)}",
            f"Total Dependencies: {code_graph.stats.get('total_edges', 0)}",
            f"Languages: {', '.join(code_graph.stats.get('languages', {}).keys())}",
            "",
            "Files (sorted by complexity):",
        ]

        sorted_nodes = sorted(
            code_graph.nodes.values(),
            key=lambda x: x.complexity,
            reverse=True
        )

        for node in sorted_nodes[:15]:
            lines.append(f"  - {node.path} ({node.language}, {node.lines} lines)")

        return "\n".join(lines)

    def _find_relevant_files(self, question: str, code_graph: CodeGraph) -> List[FileNode]:
        stopwords = {
            'the','a','an','and','or','but','in','on','at','to','for',
            'of','with','by','is','are','was','were','be','been','have',
            'has','had','do','does','did','will','would','could','should',
            'may','might','must','can','what','where','how','why','which'
        }

        keywords = [
            w for w in question.lower().split()
            if w not in stopwords and len(w) > 2
        ]

        scored = []
        for node in code_graph.nodes.values():
            score = 0
            path_lower = node.path.lower()
            for kw in keywords:
                if kw in path_lower:
                    score += 3
                for exp in node.exports:
                    if kw in exp.lower():
                        score += 2
                for imp in node.imports:
                    if kw in str(imp).lower():
                        score += 1
            if score > 0:
                scored.append((node, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [node for node, _ in scored[:5]]

    def _get_file_contents(self, files: List[FileNode], repo_path: str) -> str:
        if not files:
            return "No relevant files found."

        parts = ["=== Relevant Files ==="]
        for node in files:
            file_path = Path(repo_path) / node.path
            content = read_file_safe(file_path)
            if content:
                lines = content.split("\n")
                truncated = "\n".join(lines[:100])
                if len(lines) > 100:
                    truncated += "\n... (truncated)"
                parts.append(f"\n--- {node.path} ---\n{truncated}")
            else:
                parts.append(f"\n--- {node.path} ---\n(Could not read file)")

        return "\n".join(parts)

    def _extract_relevant_files(self, answer: str, code_graph: CodeGraph) -> List[str]:
        answer_lower = answer.lower()
        return [
            node.path
            for node in code_graph.nodes.values()
            if node.path.lower() in answer_lower
        ]


# Singleton — model loads once when backend starts
_ai_instance: Optional[CodebaseAI] = None

def get_ai() -> CodebaseAI:
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = CodebaseAI()
    return _ai_instance