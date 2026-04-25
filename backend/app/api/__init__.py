from fastapi import APIRouter
from .routes import repository, ai

api_router = APIRouter()
api_router.include_router(repository.router)
api_router.include_router(ai.router)