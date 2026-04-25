from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import os

from ...core.ai import get_ai
from ...api.routes.repository import parse_repository_to_graph

router = APIRouter(prefix="/ai", tags=["ai"])


class QuestionRequest(BaseModel):
    question: str
    repo_path: str


class AIResponse(BaseModel):
    answer: str
    relevant_files: List[str]


@router.post("/ask", response_model=AIResponse)
async def ask_codebase(request: QuestionRequest):
    """Ask a question about a parsed codebase"""

    if not os.path.exists(request.repo_path):
        raise HTTPException(status_code=404, detail="Repository path not found")

    try:
        code_graph = parse_repository_to_graph(request.repo_path)
        ai = get_ai()
        result = ai.ask_question(code_graph, request.question, request.repo_path)
        return JSONResponse(content=result)

    except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))