import os
import json
import logging
import hashlib
import asyncio
import time
import random
from typing import List, Optional, Dict, Any, Tuple
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

# Cache for 1 hour (6.1)
cache = TTLCache(maxsize=1000, ttl=3600)

# Circuit breaker (6.4)
circuit_breaker = {
    "failures": 0,
    "last_failure": 0,
    "threshold": 3,
    "cooldown": 300,
    "open": False
}

# Model version (5.3, 9.3)
MODEL_VERSION = "recommend_v1.5"

# Static map as fallback (kept)
RECOMMENDATIONS_MAP = {
    "diabetes": [
        "Reduce refined sugar and white rice intake",
        "Aim for 10,000 steps daily",
        "Get fasting blood glucose tested quarterly",
    ],
    "cardiac": [
        "Limit sodium to under 2g/day",
        "30 minutes of moderate cardio 5x per week",
        "Monitor blood pressure weekly",
    ],
    "obesity": [
        "Create a 300–500 calorie daily deficit",
        "Increase protein to 1.2g per kg body weight",
        "Limit processed foods and sugary drinks",
    ],
    "stress": [
        "Practice 10 minutes of mindfulness daily",
        "Reduce screen time by 1 hour",
        "Maintain a consistent sleep schedule",
    ],
    "sleepDisorder": [
        "Keep a consistent sleep/wake schedule",
        "Avoid screens 1 hour before bed",
        "Limit caffeine after 2pm",
    ],
}

# ------------------------------------------------------------------
# Pydantic models (same as original)
# ------------------------------------------------------------------
class RecommendRequest(BaseModel):
    userId: str
    riskScores: Dict[str, float]
    metrics: Optional[dict] = {}

    @validator('riskScores')
    def validate_scores(cls, v):
        for score in v.values():
            if not (0 <= score <= 1):
                raise ValueError('Risk scores must be between 0 and 1')
        return v

# ------------------------------------------------------------------
# Mock user profile (all personalization data)
# ------------------------------------------------------------------
async def fetch_user_profile(userId: str) -> Optional[Dict]:
    """
    Mock user profile with all fields needed for personalization.
    In production, query a database.
    """
    logger.info(f"Fetching profile for user {userId}")
    if userId.startswith('test'):
        return {
            'age': 45,
            'gender': 'female',
            'health_conditions': ['diabetes', 'hypertension'],  # for comorbidity
            'medications': ['metformin', 'lisinopril'],         # 1.5
            'mental_health': {'anxiety': True},                 # 1.6
            'past_adherence': 0.7,                               # for feasibility (3.3)
            'motivation_style': 'encouraging',                   # 4.2
            'language': 'es',                                     # 7.1
            'location': {'city': 'Madrid', 'country': 'ES', 'lat': 40.4168, 'lon': -3.7038},
            'previous_recommendations': [                         # for progress tracking (3.4)
                {'condition': 'diabetes', 'action': 'Reduce sugar', 'date': '2025-02-01'}
            ],
        }
    return None

# ------------------------------------------------------------------
# External data mocks (2.1, 2.2, 2.3)
# ------------------------------------------------------------------
async def get_local_resources(lat: float, lon: float) -> List[str]:
    """Mock nearby gyms, parks, dietitians."""
    return ["Gimnasio Municipal (0.5 km)", "Parque del Retiro (1.2 km)", "Clínica Nutrición (0.8 km)"]

async def get_weather(city: str) -> str:
    """Mock weather condition."""
    return random.choice(["sunny", "rainy", "cloudy", "snowy"])

async def get_seasonal_produce(month: int) -> List[str]:
    """Mock seasonal produce."""
    if month in [3,4,5]:
        return ["espárragos", "fresas"]
    elif month in [6,7,8]:
        return ["tomates", "sandía"]
    else:
        return ["naranjas", "coles"]

# ------------------------------------------------------------------
# OpenRouter async client with fallback and circuit breaker (6.3, 6.4)
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 300, temperature: float = 0.3) -> Optional[str]:
    global circuit_breaker
    if circuit_breaker["open"]:
        if time.time() - circuit_breaker["last_failure"] > circuit_breaker["cooldown"]:
            circuit_breaker["open"] = False
            circuit_breaker["failures"] = 0
            logger.info("Circuit breaker closed")
        else:
            logger.warning("Circuit breaker open, skipping AI call")
            return None

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(OPENROUTER_BASE_URL, headers=HEADERS, json=payload)
            resp.raise_for_status()
            data = resp.json()
            circuit_breaker["failures"] = 0
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"OpenRouter call failed (model {model}): {e}")
        circuit_breaker["failures"] += 1
        circuit_breaker["last_failure"] = time.time()
        if circuit_breaker["failures"] >= circuit_breaker["threshold"]:
            circuit_breaker["open"] = True
            logger.warning("Circuit breaker opened")
        return None

async def call_ai_with_fallback(prompt: str, max_tokens: int = 300, preferred_model: str = "haiku") -> Optional[str]:
    """Try preferred model, then fallback to others."""
    model_order = []
    if preferred_model == "haiku":
        model_order = ["anthropic/claude-3-haiku", "mistralai/mistral-7b-instruct", "google/gemini-2.5-pro-exp-03-25:free"]
    elif preferred_model == "gemini":
        model_order = ["google/gemini-2.5-pro-exp-03-25:free", "mistralai/mistral-7b-instruct", "anthropic/claude-3-haiku"]
    else:
        model_order = ["mistralai/mistral-7b-instruct", "anthropic/claude-3-haiku", "google/gemini-2.5-pro-exp-03-25:free"]
    for model in model_order:
        resp = await call_openrouter(prompt, model, max_tokens)
        if resp:
            return resp
    return None

# ------------------------------------------------------------------
# Generate personalized action for a condition (4.1, 4.2, 4.4, 7.1, 7.2, 7.3)
# ------------------------------------------------------------------
async def generate_action(condition: str, score: float, metrics: Dict,
                          profile: Optional[Dict], external: Dict) -> Tuple[str, str, float, str]:
    """
    Returns (action_text, explanation, feasibility_score, priority_override)
    """
    language = profile.get('language', 'en') if profile else 'en'
    motivation = profile.get('motivation_style', 'neutral') if profile else 'neutral'
    conditions = profile.get('health_conditions', []) if profile else []
    medications = profile.get('medications', []) if profile else []
    past_adherence = profile.get('past_adherence', 0.5) if profile else 0.5
    weather = external.get('weather', 'unknown')
    local_resources = external.get('local_resources', [])
    seasonal = external.get('seasonal_produce', [])

    # Build context
    context = f"""
Condition: {condition}
Current risk score: {score:.2f}
User metrics: {metrics}
User's other conditions: {conditions}
Medications: {medications}
Motivation style: {motivation}
Weather: {weather}
Local resources: {local_resources}
Seasonal produce: {seasonal}
"""

    prompt = f"""You are a health coach. Generate ONE personalized, actionable recommendation for the user's condition: {condition}.
The recommendation should be specific, measurable, and tailored to the user's context. Write in {language} language, using simple words.

{context}

Also provide:
- A one-sentence explanation of why this action helps (educational micro-content).
- A feasibility score (0-1) estimating how likely the user is to follow this, based on past adherence ({past_adherence}) and context.
- A priority override: "high", "medium", or "low" based on urgency and potential impact.

Return a JSON object with fields: "action", "explanation", "feasibility", "priority".
"""
    resp = await call_ai_with_fallback(prompt, max_tokens=400, preferred_model="haiku")
    if resp:
        try:
            import re
            json_match = re.search(r'\{.*\}', resp, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                action = data.get('action', '')
                explanation = data.get('explanation', '')
                feasibility = float(data.get('feasibility', past_adherence))
                priority = data.get('priority', 'medium')
                return action, explanation, feasibility, priority
        except Exception as e:
            logger.error(f"Failed to parse AI action: {e}")
    # Fallback to static map
    fallback_actions = RECOMMENDATIONS_MAP.get(condition, [])
    if fallback_actions:
        return fallback_actions[0], "Follow this guideline to improve your health.", past_adherence, "medium"
    else:
        return f"Work with your doctor to manage {condition}.", "Professional guidance is key.", past_adherence, "medium"

# ------------------------------------------------------------------
# Dynamic risk threshold and priority adjustment (1.2, 3.1, 3.3)
# ------------------------------------------------------------------
def compute_priority(condition: str, score: float, trend: str, feasibility: float) -> str:
    """
    Combine score, trend, feasibility to determine final priority.
    """
    base = "high" if score > 0.7 else "medium" if score > 0.4 else "low"
    if trend == "worsening" and score > 0.3:
        base = "high"
    if feasibility < 0.3:
        base = "low"  # if unlikely to follow, de-prioritize
    return base

# ------------------------------------------------------------------
# Mock trend analysis (3.1) - would need history; for demo, random
# ------------------------------------------------------------------
def get_trend(condition: str, userId: str) -> str:
    # In production, fetch from database
    return random.choice(["stable", "improving", "worsening"])

# ------------------------------------------------------------------
# Logging for transparency (5.1, 5.2, 5.3, 8.1, 8.2, 9.3)
# ------------------------------------------------------------------
async def log_insights(userId: str, condition: str, action: str, explanation: str,
                       source: str, model_used: str, feasibility: float):
    logger.info(f"User {userId} - Condition {condition}: action='{action}', explanation='{explanation}', source={source}, model={model_used}, feasibility={feasibility}")
    # In production, store in a database

# ------------------------------------------------------------------
# Main endpoint (async, with caching, fallback, parallel AI)
# ------------------------------------------------------------------
@router.post("")
async def recommend(body: RecommendRequest):
    """
    Generate personalized recommendations based on risk scores.
    """
    logger.info(f"Recommend request for user {body.userId} (model {MODEL_VERSION})")

    # Validate
    try:
        body.riskScores
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate cache key (6.1)
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # Fetch user profile
    profile = await fetch_user_profile(body.userId)

    # Gather external data concurrently (2.1, 2.2, 2.3)
    external_tasks = []
    if profile and profile.get('location'):
        lat = profile['location']['lat']
        lon = profile['location']['lon']
        city = profile['location']['city']
        external_tasks.append(get_weather(city))
        external_tasks.append(get_local_resources(lat, lon))
        external_tasks.append(get_seasonal_produce(time.localtime().tm_mon))
    else:
        external_tasks = [asyncio.sleep(0, "unknown"), asyncio.sleep(0, []), asyncio.sleep(0, [])]

    weather, local_resources, seasonal_produce = await asyncio.gather(*external_tasks)

    external_context = {
        'weather': weather,
        'local_resources': local_resources,
        'seasonal_produce': seasonal_produce,
    }

    # Prepare list of tasks for each condition
    tasks = []
    for condition, score in body.riskScores.items():
        # Apply dynamic threshold (1.2) – we'll generate if score > 0.2 and condition in map, else skip
        # But we'll also consider trend later. For now, include if score > 0.2.
        if score > 0.2 and condition in RECOMMENDATIONS_MAP:
            tasks.append(generate_action(condition, score, body.metrics, profile, external_context))

    # Run all AI calls concurrently (6.2)
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        results = []

    # Build recommendations list
    recommendations = []
    for i, (condition, score) in enumerate([(c, s) for c, s in body.riskScores.items() if c in RECOMMENDATIONS_MAP and s > 0.2]):
        if i < len(results) and not isinstance(results[i], Exception):
            action, explanation, feasibility, priority_override = results[i]
            # Get trend
            trend = get_trend(condition, body.userId)
            # Compute final priority
            priority = compute_priority(condition, score, trend, feasibility)
            # Override with AI's suggestion if provided
            if priority_override != "medium":
                priority = priority_override
            recommendations.append({
                "condition": condition,
                "risk": round(score, 2),
                "action": action,
                "priority": priority,
            })
            # Log insights
            asyncio.create_task(log_insights(body.userId, condition, action, explanation,
                                              "AI", MODEL_VERSION, feasibility))
        else:
            # Fallback to static map if AI failed
            fallback_actions = RECOMMENDATIONS_MAP.get(condition, [])
            for rec in fallback_actions:
                recommendations.append({
                    "condition": condition,
                    "risk": round(score, 2),
                    "action": rec,
                    "priority": "high" if score > 0.7 else "medium",
                })
            asyncio.create_task(log_insights(body.userId, condition, rec,
                                              "Static recommendation", "static", MODEL_VERSION, 0.5))

    # Sort by priority (high > medium > low) (3.2)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 99))

    # Limit to top 10
    recommendations = recommendations[:10]

    # Construct response (exact same format)
    response = {
        "userId": body.userId,
        "recommendations": recommendations,
        "generatedAt": "now",  # could use datetime.now().isoformat()
    }

    # Cache response
    cache[cache_key] = response

    logger.info(f"Recommendations generated for {body.userId}")
    return response