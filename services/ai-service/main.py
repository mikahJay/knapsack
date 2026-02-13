# ai-service/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

from services.claude_service import ClaudeService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Knapsack AI Service",
    description="Claude-powered matching service for needs and resources",
    version="1.0.0"
)

# Add CORS middleware (so match-server can call this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your services
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Claude service
claude_service = ClaudeService()


# Request/Response models
class MatchRequest(BaseModel):
    """Request to match a need against resources"""
    need: Dict[str, Any] = Field(..., description="Need object with 'description' and optional 'metadata'")
    resources: List[Dict[str, Any]] = Field(..., description="List of available resources")
    top_k: int = Field(10, ge=1, le=50, description="Maximum number of candidates to return")
    
    class Config:
        json_schema_extra = {
            "example": {
                "need": {
                    "id": "need-123",
                    "description": "I want to make a sandwich",
                    "metadata": {"urgency": "low"}
                },
                "resources": [
                    {"id": "res-1", "description": "loaf of bread", "metadata": {}},
                    {"id": "res-2", "description": "cheese", "metadata": {}}
                ],
                "top_k": 10
            }
        }


class Candidate(BaseModel):
    """A candidate match (combination of resources that could fulfill a need)"""
    resource_ids: List[str] = Field(..., description="IDs of resources in this combination")
    feasibility_score: int = Field(..., ge=0, le=100, description="0-100 score of how well this fulfills the need")
    explanation: str = Field(..., description="Explanation of why this combination works")
    gaps: List[str] = Field(default_factory=list, description="Obstacles or missing pieces")
    confidence: str = Field(..., description="Confidence level: low, medium, or high")


class MatchResponse(BaseModel):
    """Response containing candidate matches"""
    candidates: List[Candidate]
    total_candidates: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "candidates": [
                    {
                        "resource_ids": ["res-1", "res-2"],
                        "feasibility_score": 90,
                        "explanation": "Bread and cheese combine to make a classic cheese sandwich",
                        "gaps": [],
                        "confidence": "high"
                    }
                ],
                "total_candidates": 1
            }
        }


class BatchMatchRequest(BaseModel):
    """Request to match multiple needs against resources"""
    needs: List[Dict[str, Any]] = Field(..., description="List of needs to match")
    resources: List[Dict[str, Any]] = Field(..., description="List of available resources")
    top_k: int = Field(5, ge=1, le=20, description="Max candidates per need")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


# Routes
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }


@app.post("/match", response_model=MatchResponse)
async def match_need(request: MatchRequest):
    """
    Match a single need against available resources.
    
    Returns up to `top_k` candidate solutions, where each candidate
    is a combination of one or more resources.
    """
    try:
        logger.info(f"Matching need against {len(request.resources)} resources")
        
        candidates = claude_service.match_need_to_resources(
            need=request.need,
            resources=request.resources,
            top_k=request.top_k
        )
        
        return {
            "candidates": candidates,
            "total_candidates": len(candidates)
        }
        
    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during matching: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during matching")


@app.post("/match/batch")
async def batch_match(request: BatchMatchRequest):
    """
    Match multiple needs against resources in a single API call.
    More efficient for batch processing.
    
    Returns a dict mapping need_id -> list of candidates.
    """
    try:
        logger.info(f"Batch matching {len(request.needs)} needs against {len(request.resources)} resources")
        
        results = claude_service.batch_match(
            needs=request.needs,
            resources=request.resources,
            top_k=request.top_k
        )
        
        return results
        
    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during batch matching: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during batch matching")


# Run with: uvicorn main:app --reload --port 9000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)