import os
import json
import logging
import hashlib
import asyncio
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
import httpx
from cachetools import TTLCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

# Cache for 1 hour, max 1000 entries
cache = TTLCache(maxsize=1000, ttl=3600)

# ------------------------------------------------------------------
# Enhanced Pydantic model with validation (point 4)
# ------------------------------------------------------------------
class BaselineRequest(BaseModel):
    userId: str
    previousScore: float      # 0–100 wellness score
    currentScore: float
    previousCredits: Optional[int] = 0

    @validator('previousScore', 'currentScore')
    def validate_score(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Score must be between 0 and 100')
        return v

    @validator('previousCredits')
    def validate_credits(cls, v):
        if v < 0:
            raise ValueError('previousCredits cannot be negative')
        return v

# ------------------------------------------------------------------
# Feature engineering (point 3)
# ------------------------------------------------------------------
def engineer_features(body: BaselineRequest, history: Optional[Dict] = None) -> Dict[str, float]:
    """
    Create derived features for AI models.
    """
    delta = body.currentScore - body.previousScore
    ratio = body.currentScore / max(body.previousScore, 1)  # avoid division by zero
    improvement = (delta / max(body.previousScore, 1)) * 100

    features = {
        'score_delta': delta,
        'score_ratio': ratio,
        'improvement_percent': improvement,
        'motivation_factor': improvement * body.previousCredits / 100,  # interaction term
    }

    # Add trend from history if available
    if history and 'trend' in history:
        features['trend_score'] = 1.0 if history['trend'] == 'improving' else 0.5 if history['trend'] == 'stable' else 0.0

    return features

# ------------------------------------------------------------------
# Placeholder for user history (point 9)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for past scores.
    Returns a dict with trend analysis or None.
    """
    # Mock implementation for demonstration
    logger.info(f"Fetching history for user {userId}")
    # Simulate DB lookup
    if userId.startswith('test'):
        return {
            'trend': 'improving',
            'past_scores': [65, 70, 75, 80],  # last 4 scores
            'volatility': 'low'
        }
    return None

# ------------------------------------------------------------------
# OpenRouter async client (point 7)
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 150) -> Optional[str]:
    """
    Make an async call to OpenRouter API and return the response text.
    """
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.3,  # low for deterministic output
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(OPENROUTER_BASE_URL, headers=HEADERS, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"OpenRouter call failed (model {model}): {e}")
        return None

# ------------------------------------------------------------------
# Predict future improvement (point 2)
# ------------------------------------------------------------------
async def predict_improvement(body: BaselineRequest, features: Dict) -> Optional[float]:
    """
    Use Mistral to estimate expected improvement percentage.
    Returns a float (e.g., 5.2) or None.
    """
    prompt = f"""Given the following health score data, predict the expected improvement percentage for the next period.
Return ONLY a single number (e.g., 5.2). Do not include any other text.

Previous score: {body.previousScore}
Current score: {body.currentScore}
Score delta: {features['score_delta']:.2f}
Improvement so far: {features['improvement_percent']:.2f}%
Previous credits earned: {body.previousCredits}
"""
    response = await call_openrouter(prompt, model="mistralai/mistral-7b-instruct", max_tokens=10)
    if response:
        try:
            import re
            numbers = re.findall(r"[-+]?\d*\.?\d+", response)
            if numbers:
                return float(numbers[0])
        except:
            pass
    return None

# ------------------------------------------------------------------
# Generate adaptive goal with explainability (points 1, 8, 10 combined)
# ------------------------------------------------------------------
async def generate_adaptive_goal(body: BaselineRequest, features: Dict, history: Optional[Dict]) -> str:
    """
    Use a reasoning model (DeepSeek R1) to explain factors, then a coaching model (Claude Haiku) to craft the goal.
    Falls back to heuristic if AI fails.
    """
    # Step 1: Explain factors (point 10) using DeepSeek R1
    explain_prompt = f"""Explain the top 2 factors that should influence the next health goal for this user, based on their progress.
Keep it concise (one sentence). User data:
- Previous score: {body.previousScore}
- Current score: {body.currentScore}
- Improvement: {features['improvement_percent']:.2f}%
- Previous credits: {body.previousCredits}
- History trend: {history.get('trend', 'unknown') if history else 'unknown'}
"""
    explanation = await call_openrouter(explain_prompt, model="deepseek/deepseek-r1:free", max_tokens=50)

    # Step 2: Generate goal using Claude Haiku (point 1 & 8)
    goal_prompt = f"""You are a health coach. Based on the following information, provide ONE actionable, personalized sentence for the user's next health goal.
Be specific and encouraging.

User's progress:
- Previous wellness score: {body.previousScore}/100
- Current score: {body.currentScore}/100
- Improvement: {features['improvement_percent']:.2f}%
- Previous credits: {body.previousCredits}
- Trend: {history.get('trend', 'unknown') if history else 'unknown'}

Additional insight: {explanation if explanation else 'Focus on overall wellness.'}

Return only the goal sentence, no extra text.
"""
    goal = await call_openrouter(goal_prompt, model="anthropic/claude-3-haiku", max_tokens=60)
    if goal:
        return goal.strip()
    # Fallback to heuristic (point 1 fallback)
    return _fallback_goal(features['improvement_percent'])

def _fallback_goal(improvement: float) -> str:
    if improvement >= 10:
        return "Excellent progress! Challenge yourself with a fitness goal."
    elif improvement >= 5:
        return "Great improvement! Focus on sleep quality this week."
    elif improvement >= 0:
        return "Keep going! Add 1,000 more steps per day."
    else:
        return "Recovery needed. Prioritize sleep and hydration."

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def baseline_compare(body: BaselineRequest):
    """
    Compare current health against previous baseline using AI-powered insights.
    """
    # Log request (point 5)
    logger.info(f"Baseline compare request for user {body.userId}")

    # 1. Validation (already done by Pydantic, but catch explicitly)
    try:
        # Trigger validation (though FastAPI does it automatically)
        body.previousScore
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Generate cache key (point 6)
    cache_data = body.dict()
    # Include userId because history depends on it
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    # 3. Check cache
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # 4. Fetch user history (async) (point 9)
    history = await fetch_user_history(body.userId)

    # 5. Feature engineering (point 3)
    features = engineer_features(body, history)

    # 6. Run AI tasks concurrently (point 7)
    pred_task = predict_improvement(body, features)
    goal_task = generate_adaptive_goal(body, features, history)

    pred_result, goal_result = await asyncio.gather(pred_task, goal_task, return_exceptions=True)

    # 7. Compute improvement and credits
    improvement = ((body.currentScore - body.previousScore) / max(body.previousScore, 1)) * 100
    credits_earned = max(0, int(improvement * 5))  # base formula

    # 8. If prediction succeeded, optionally adjust credits (point 2)
    if not isinstance(pred_result, Exception) and pred_result is not None:
        # Use predicted improvement to refine credits (e.g., add a bonus)
        predicted_improvement = pred_result
        # For example, if predicted improvement is high, award extra credits
        if predicted_improvement > improvement * 1.2:
            credits_earned += int(predicted_improvement * 2)  # bonus
        logger.info(f"Predicted improvement: {predicted_improvement:.2f}%, credits adjusted to {credits_earned}")

    # 9. Determine adaptive goal
    if isinstance(goal_result, Exception) or goal_result is None:
        adaptive_goal = _fallback_goal(improvement)
    else:
        adaptive_goal = goal_result

    # 10. Construct response
    response = {
        "userId": body.userId,
        "previousScore": round(body.previousScore, 2),
        "currentScore": round(body.currentScore, 2),
        "improvementPercent": round(improvement, 2),
        "creditsEarned": credits_earned,
        "totalCredits": body.previousCredits + credits_earned,
        "adaptiveGoal": adaptive_goal,
    }

    # 11. Cache response
    cache[cache_key] = response

    # 12. Log result (point 5)
    logger.info(f"Baseline result for user {body.userId}: improvement {improvement:.2f}%, credits {credits_earned}")

    return response