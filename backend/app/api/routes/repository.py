from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import tempfile
import shutil
import os
import zipfile
from pathlib import Path
from typing import Optional
import git
from ...core.parser import CodeParser
from ...models.graph import CodeGraph, FileNode, Edge

router = APIRouter(prefix="/repository", tags=["repository"])

@router.post("/upload")
async def upload_repository(file: UploadFile = File(...)):
    """Upload and parse repository from ZIP file"""
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save uploaded file
            uploaded_file_path = temp_path / file.filename
            with open(uploaded_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Extract ZIP file if it's a ZIP
            repo_path = temp_path
            if file.filename.endswith('.zip'):
                repo_path = await extract_zip(uploaded_file_path, temp_path)
            
            # Parse repository
            code_graph = parse_repository_to_graph(str(repo_path))
            
            return JSONResponse(content={
                "status": "success",
                "files_parsed": len(code_graph.nodes),
                "data": code_graph.to_dict()
            })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-git")
async def parse_git_repository(git_url: str = Query(..., description="Git repository URL")):
    """Clone and parse repository from Git URL"""
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Clone git repository
            repo_path = await clone_git_repository(git_url, temp_path)
            
            # Parse repository
            code_graph = parse_repository_to_graph(str(repo_path))
            
            return JSONResponse(content={
                "status": "success",
                "files_parsed": len(code_graph.nodes),
                "data": code_graph.to_dict()
            })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-local/{path:path}")
async def parse_local_repository(path: str):
    """Parse local repository by path"""
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Path not found")
        
        # Parse repository
        code_graph = parse_repository_to_graph(path)
        
        return JSONResponse(content={
            "status": "success",
            "files_parsed": len(code_graph.nodes),
            "data": code_graph.to_dict()
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def extract_zip(zip_file_path: Path, extract_to: Path) -> Path:
    """Extract ZIP file and return the path to the extracted repository"""
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        
        # Find the actual repository root (might be in a subdirectory)
        extracted_items = list(extract_to.iterdir())
        if len(extracted_items) == 1 and extracted_items[0].is_dir():
            return extracted_items[0]
        else:
            return extract_to
    except Exception as e:
        raise Exception(f"Failed to extract ZIP file: {str(e)}")

async def clone_git_repository(git_url: str, clone_to: Path) -> Path:
    """Clone Git repository and return the path to the cloned repository"""
    try:
        # Clone repository using GitPython
        repo = git.Repo.clone_from(git_url, str(clone_to))
        return clone_to
    except git.exc.GitCommandError as e:
        raise Exception(f"Failed to clone repository: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to clone repository: {str(e)}")

def parse_repository_to_graph(repo_path: str) -> CodeGraph:
    parser = CodeParser(repo_path)
    return parser.parse_repository()

'''
def calculate_complexity(file_info: dict) -> int:
    """Calculate complexity score for a file"""
    # Simple complexity calculation based on number of functions and classes
    complexity = 0
    complexity += len(file_info.get('functions', [])) * 2
    complexity += len(file_info.get('classes', [])) * 3
    complexity += file_info.get('lines', 0) // 100  # Add 1 point for every 100 lines
    return complexity
'''

def serialize_code_graph(code_graph: CodeGraph) -> dict:
    """Convert CodeGraph object to serializable dictionary"""
    return {
        "nodes": [
            {
                "id": node.id,
                "path": node.path,
                "language": node.language,
                "type": node.type.value if hasattr(node.type, 'value') else str(node.type),
                "exports": node.exports,
                "imports": node.imports,
                "lines": node.lines,
                "complexity": node.complexity,
                "content": node.content
            }
            for node in code_graph.nodes.values()
        ],
        "edges": [
            {
                "id": edge.id,
                "source": edge.source,
                "target": edge.target,
                "type": edge.type.value if hasattr(edge.type, 'value') else str(edge.type),
                "label": edge.label
            }
            for edge in code_graph.edges
        ],
        "stats": code_graph.stats
    }