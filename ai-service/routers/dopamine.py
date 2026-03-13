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

# Configure logging (point 7)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# OpenRouter configuration (point 12 – ready for microservice extraction)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

# Cache for 1 hour, max 1000 entries (point 8)
cache = TTLCache(maxsize=1000, ttl=3600)

# ------------------------------------------------------------------
# Enhanced Pydantic model with validation (point 6)
# ------------------------------------------------------------------
class DopamineRequest(BaseModel):
    userId: str
    screenTimeHours: float
    socialMediaHours: float = 0
    gamingHours: float = 0
    exerciseHours: float = 0
    sleepHours: float = 7

    @validator('screenTimeHours', 'socialMediaHours', 'gamingHours', 'exerciseHours', 'sleepHours')
    def validate_hours(cls, v):
        if v < 0 or v > 24:
            raise ValueError('Hours must be between 0 and 24')
        return v

# ------------------------------------------------------------------
# Feature engineering (point 5)
# ------------------------------------------------------------------
def engineer_features(body: DopamineRequest, history: Optional[Dict] = None) -> Dict[str, float]:
    """
    Create derived features for AI models.
    """
    # Interaction terms
    screen_social_interaction = body.screenTimeHours * body.socialMediaHours
    screen_gaming_interaction = body.screenTimeHours * body.gamingHours
    exercise_ratio = body.exerciseHours / max(body.screenTimeHours, 1)  # avoid division by zero

    # Normalize inputs to 0-1 range (domain‑based)
    normalized = {
        'screenTime_norm': body.screenTimeHours / 24,
        'socialMedia_norm': body.socialMediaHours / 24,
        'gaming_norm': body.gamingHours / 24,
        'exercise_norm': body.exerciseHours / 24,
        'sleep_norm': body.sleepHours / 24,
        'screen_social_interaction': screen_social_interaction / (24*24),  # normalize to ~0-1
        'screen_gaming_interaction': screen_gaming_interaction / (24*24),
        'exercise_screen_ratio': min(exercise_ratio, 1.0),  # cap at 1
    }

    # Add trend from history if available
    if history and 'trend' in history:
        normalized['trend_score'] = 1.0 if history['trend'] == 'improving' else 0.5 if history['trend'] == 'stable' else 0.0

    return normalized

# ------------------------------------------------------------------
# Placeholder for user history (point 10)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for past dopamine scores and lifestyle data.
    Returns a dict with trend analysis or None.
    """
    logger.info(f"Fetching history for user {userId}")
    # Mock implementation for demonstration
    if userId.startswith('test'):
        return {
            'trend': 'worsening',  # could be improving/stable/worsening
            'past_scores': [65, 62, 58, 55],  # last 4 scores
            'avg_screen_time': 6.5,
        }
    return None

# ------------------------------------------------------------------
# OpenRouter async client (point 9)
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
# AI‑powered dopamine score prediction (point 1)
# ------------------------------------------------------------------
async def predict_dopamine_score(body: DopamineRequest, features: Dict) -> Optional[float]:
    """
    Use Mistral 7B to estimate dopamine balance (0-100) based on medical knowledge.
    """
    prompt = f"""You are a medical AI trained on neuroscience and dopamine regulation.
Based on the following lifestyle inputs, estimate the user's dopamine balance score from 0 to 100, where 100 is optimal and below 40 indicates depletion.
Return ONLY a single number (e.g., 72). Do not include any other text.

User data:
- Screen time: {body.screenTimeHours} hours/day
- Social media: {body.socialMediaHours} hours/day
- Gaming: {body.gamingHours} hours/day
- Exercise: {body.exerciseHours} hours/day
- Sleep: {body.sleepHours} hours/day

Consider that excessive screen time, social media, and gaming deplete dopamine sensitivity, while exercise and adequate sleep (beyond 6 hours) help recovery.
"""
    response = await call_openrouter(prompt, model="mistralai/mistral-7b-instruct", max_tokens=10)
    if response:
        try:
            import re
            numbers = re.findall(r"\d+\.?\d*", response)
            if numbers:
                return float(numbers[0])
        except:
            pass
    return None

# ------------------------------------------------------------------
# Predict future dopamine score (point 4)
# ------------------------------------------------------------------
async def predict_future_score(body: DopamineRequest, features: Dict) -> Optional[float]:
    """
    Use Mistral 7B to predict dopamine score in one week if habits continue.
    """
    prompt = f"""Based on current habits, predict the user's dopamine score in one week if they continue the same routine.
Return ONLY a single number between 0 and 100.

Current habits:
- Screen time: {body.screenTimeHours}h
- Social media: {body.socialMediaHours}h
- Gaming: {body.gamingHours}h
- Exercise: {body.exerciseHours}h
- Sleep: {body.sleepHours}h
"""
    response = await call_openrouter(prompt, model="mistralai/mistral-7b-instruct", max_tokens=10)
    if response:
        try:
            import re
            numbers = re.findall(r"\d+\.?\d*", response)
            if numbers:
                return float(numbers[0])
        except:
            pass
    return None

# ------------------------------------------------------------------
# Explainability of score contributions (point 3)
# ------------------------------------------------------------------
async def explain_factors(body: DopamineRequest, features: Dict) -> Optional[str]:
    """
    Use DeepSeek R1 to generate a short explanation of the main positive/negative factors.
    """
    prompt = f"""Explain in one sentence the top positive and negative factors affecting this user's dopamine balance.
Be concise.

Screen time: {body.screenTimeHours}h
Social media: {body.socialMediaHours}h
Gaming: {body.gamingHours}h
Exercise: {body.exerciseHours}h
Sleep: {body.sleepHours}h
"""
    response = await call_openrouter(prompt, model="deepseek/deepseek-r1:free", max_tokens=60)
    return response.strip() if response else None

# ------------------------------------------------------------------
# Personalized suggestion generation (point 2) + incorporate history, future, explanation
# ------------------------------------------------------------------
async def generate_suggestion(body: DopamineRequest, features: Dict, history: Optional[Dict],
                              explanation: Optional[str], future_score: Optional[float]) -> str:
    """
    Use Claude Haiku to generate a tailored, actionable suggestion.
    """
    # Build context
    context = f"Current dopamine score factors: screen {body.screenTimeHours}h, social {body.socialMediaHours}h, gaming {body.gamingHours}h, exercise {body.exerciseHours}h, sleep {body.sleepHours}h."
    if history:
        context += f" Trend: {history.get('trend', 'unknown')}."
    if explanation:
        context += f" Key factors: {explanation}"
    if future_score is not None:
        context += f" If habits continue, future score: {future_score:.1f}."

    prompt = f"""You are a health coach. Based on the following, give ONE actionable, encouraging sentence to improve dopamine balance. Be specific.

{context}

Suggestion:"""
    response = await call_openrouter(prompt, model="anthropic/claude-3-haiku", max_tokens=80)
    if response:
        return response.strip()
    # Fallback to original suggestion based on heuristic score (will be computed later)
    return None

# ------------------------------------------------------------------
# Original heuristic functions (for fallback)
# ------------------------------------------------------------------
def heuristic_score_and_breakdown(body: DopamineRequest) -> tuple:
    depletion = (
        body.screenTimeHours * 8
        + body.socialMediaHours * 12
        + body.gamingHours * 10
    )
    recovery = (
        body.exerciseHours * 20
        + max(0, body.sleepHours - 6) * 10
    )
    raw_score = 100 - depletion + recovery
    score = max(0, min(100, raw_score))
    return score, depletion, recovery

def heuristic_suggestion(score: float) -> str:
    if score >= 75:
        return "Great dopamine balance. Keep it up."
    elif score >= 50:
        return "Reduce social media by 30 min and take a walk."
    elif score >= 25:
        return "Digital detox recommended. Prioritize sleep & exercise."
    else:
        return "Significant screen overuse. Take a full day off screens."

def heuristic_status(score: float) -> str:
    if score >= 75:
        return "Healthy"
    elif score >= 50:
        return "Moderate"
    elif score >= 25:
        return "Low"
    else:
        return "Depleted"

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def dopamine_score(body: DopamineRequest):
    """
    Estimate dopamine balance score using AI, with personalized suggestions.
    """
    # Log request (point 7)
    logger.info(f"Dopamine score request for user {body.userId}")

    # 1. Validation (already done by Pydantic, but catch explicitly)
    try:
        # Trigger validation (FastAPI does automatically, but for completeness)
        body.screenTimeHours
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Generate cache key (point 8)
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    # 3. Check cache
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # 4. Fetch user history (async) (point 10)
    history = await fetch_user_history(body.userId)

    # 5. Feature engineering (point 5)
    features = engineer_features(body, history)

    # 6. Run AI tasks concurrently (point 9)
    pred_task = predict_dopamine_score(body, features)      # point 1
    future_task = predict_future_score(body, features)      # point 4
    explain_task = explain_factors(body, features)          # point 3
    # We'll run suggestion after gathering these because it uses their outputs
    pred, future, explanation = await asyncio.gather(
        pred_task, future_task, explain_task,
        return_exceptions=True
    )

    # 7. Determine score (use AI if available, else heuristic)
    if isinstance(pred, Exception) or pred is None:
        logger.warning("AI prediction failed, falling back to heuristic")
        score, depletion, recovery = heuristic_score_and_breakdown(body)
    else:
        score = max(0, min(100, pred))  # ensure within 0-100
        # For breakdown, still compute heuristic for consistency (point 11: breakdown remains numeric)
        _, depletion, recovery = heuristic_score_and_breakdown(body)

    # 8. Generate suggestion using AI (point 2) – pass gathered outputs
    if isinstance(explanation, Exception):
        explanation = None
    if isinstance(future, Exception):
        future = None

    suggestion = await generate_suggestion(body, features, history, explanation, future)
    if suggestion is None:
        suggestion = heuristic_suggestion(score)

    # 9. Determine status based on final score (original logic)
    status = heuristic_status(score)

    # 10. Construct response (same format)
    response = {
        "userId": body.userId,
        "dopamineScore": round(score, 1),
        "status": status,
        "suggestion": suggestion,
        "breakdown": {
            "depletionScore": round(depletion, 1),
            "recoveryScore": round(recovery, 1),
        },
    }

    # 11. Cache response
    cache[cache_key] = response

    # 12. Log result (point 7)
    logger.info(f"Dopamine result for user {body.userId}: score {score:.1f}")

    return response