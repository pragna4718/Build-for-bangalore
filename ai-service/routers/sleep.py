import os
import json
import logging
import hashlib
import asyncio
import math
import random
import time
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

# Model version (9.3)
MODEL_VERSION = "sleep_v1.2"

# Original constant (fallback)
DEFAULT_RECOMMENDED_SLEEP = 8.0

# ------------------------------------------------------------------
# Pydantic models (same as original)
# ------------------------------------------------------------------
class SleepEntry(BaseModel):
    date: str
    hours: float

    @validator('hours')
    def validate_hours(cls, v):
        if v < 0 or v > 24:
            raise ValueError('Sleep hours must be between 0 and 24')
        return v

class SleepDebtRequest(BaseModel):
    userId: str
    sleepHistory: List[SleepEntry]

# ------------------------------------------------------------------
# Placeholder for user profile (all personalization fields)
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
            'activity_level': 'moderate',
            'health_conditions': ['insomnia'],  # 1.4
            'sleep_quality_history': [  # 1.2
                {'date': '2025-03-01', 'quality': 'restless'},
                {'date': '2025-03-02', 'quality': 'good'},
            ],
            'circadian_type': 'night_owl',  # 1.3
            'stress_level': 7,  # 1.6 (1-10)
            'is_pregnant': False,  # 1.7
            'is_postpartum': False,
            'medications': ['antihistamine'],  # 1.5
            'language': 'es',  # 7.1
            'location': {'city': 'Madrid', 'country': 'ES', 'lat': 40.4168, 'lon': -3.7038},
            'sleep_badges': [],  # 4.6
        }
    return None

# ------------------------------------------------------------------
# External API mocks (2.1–2.5)
# ------------------------------------------------------------------
async def get_seasonal_effect(lat: float, lon: float) -> float:
    """Return adjustment to recommended sleep based on season (hours)."""
    # Northern hemisphere: winter more sleep
    month = time.localtime().tm_mon
    if month in [12, 1, 2]:
        return 0.5  # need 0.5h more in winter
    elif month in [6, 7, 8]:
        return -0.3  # need 0.3h less in summer
    return 0.0

async def is_daylight_saving() -> bool:
    """Check if DST is active today (mock)."""
    # In production, use calendar API
    return time.localtime().tm_isdst > 0

async def get_sun_times(lat: float, lon: float) -> Dict[str, str]:
    """Mock sunrise/sunset times."""
    return {
        'sunrise': '07:30',
        'sunset': '19:45'
    }

async def get_noise_level(city: str) -> str:
    """Mock average noise level."""
    return random.choice(['low', 'moderate', 'high'])

async def get_air_quality(city: str) -> str:
    """Mock air quality."""
    return random.choice(['good', 'moderate', 'poor'])

# ------------------------------------------------------------------
# OpenRouter async client with fallback and circuit breaker
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

async def call_ai_with_fallback(prompt: str, max_tokens: int = 300, preferred_model: str = "gemini") -> Optional[str]:
    """Try Gemini first, then Mistral (6.3)."""
    models = []
    if preferred_model == "gemini":
        models = ["google/gemini-2.5-pro-exp-03-25:free", "mistralai/mistral-7b-instruct"]
    else:
        models = ["mistralai/mistral-7b-instruct", "google/gemini-2.5-pro-exp-03-25:free"]
    for model in models:
        resp = await call_openrouter(prompt, model, max_tokens)
        if resp:
            return resp
    return None

# ------------------------------------------------------------------
# AI: Personalised recommended sleep (1.1)
# ------------------------------------------------------------------
async def get_personalized_recommended_sleep(profile: Optional[Dict]) -> float:
    if not profile:
        return DEFAULT_RECOMMENDED_SLEEP

    prompt = f"""Based on this user profile, determine the optimal sleep duration (hours per night). Return only a number between 5 and 10.

User profile:
- Age: {profile.get('age')}
- Gender: {profile.get('gender')}
- Activity level: {profile.get('activity_level')}
- Health conditions: {profile.get('health_conditions')}
- Stress level (1-10): {profile.get('stress_level')}
- Pregnant/postpartum: {profile.get('is_pregnant')}/{profile.get('is_postpartum')}
- Medications: {profile.get('medications')}

Consider medical guidelines and adjust for individual factors.
"""
    resp = await call_ai_with_fallback(prompt, max_tokens=10, preferred_model="gemini")
    if resp:
        try:
            return float(resp.strip())
        except:
            pass
    return DEFAULT_RECOMMENDED_SLEEP

# ------------------------------------------------------------------
# Weighted debt calculation (3.1)
# ------------------------------------------------------------------
def compute_weighted_debt(history: List[SleepEntry], recommended: float) -> float:
    """
    Apply exponential weighting: more recent days count more.
    """
    if not history:
        return 0.0
    total_weight = 0
    weighted_debt = 0.0
    for i, entry in enumerate(reversed(history)):  # most recent first
        weight = math.exp(-i * 0.2)  # decay factor
        debt = max(0, recommended - entry.hours)
        weighted_debt += debt * weight
        total_weight += weight
    return weighted_debt / total_weight * len(history)  # scale back to approximate total

# ------------------------------------------------------------------
# Recovery capacity prediction (3.2)
# ------------------------------------------------------------------
async def predict_recovery_capacity(profile: Optional[Dict], debt: float) -> Tuple[float, int]:
    """
    Returns (extra_hours_per_night, max_nights)
    """
    if not profile:
        return 1.5, 10  # default

    prompt = f"""Based on this user profile and sleep debt ({debt:.1f}h), recommend a safe and effective recovery plan.
Return a JSON object with "extra_hours_per_night" (0.5-2.5) and "max_nights" (1-14).

User profile:
- Age: {profile.get('age')}
- Health conditions: {profile.get('health_conditions')}
- Stress level: {profile.get('stress_level')}
- Medications: {profile.get('medications')}

Consider that high stress or certain conditions require gentler recovery.
"""
    resp = await call_ai_with_fallback(prompt, max_tokens=100, preferred_model="mistral")
    if resp:
        try:
            import re
            json_match = re.search(r'\{.*\}', resp, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                extra = float(data.get('extra_hours_per_night', 1.5))
                nights = int(data.get('max_nights', 10))
                return extra, nights
        except:
            pass
    return 1.5, 10

# ------------------------------------------------------------------
# Generate personalized tip (4.1, 4.2, 4.3, 4.4, 7.1)
# ------------------------------------------------------------------
async def generate_personalized_tip(profile: Optional[Dict], debt: float, trend: str,
                                    recommended: float, extra_hours: float, nights: int,
                                    external: Dict) -> str:
    language = profile.get('language', 'en') if profile else 'en'
    stress = profile.get('stress_level', 5) if profile else 5
    conditions = profile.get('health_conditions', []) if profile else []
    circadian = profile.get('circadian_type', 'unknown') if profile else 'unknown'

    prompt = f"""You are a sleep coach. Based on the following context, generate ONE sentence of personalized advice for the user. Write in {language} language.
Keep it concise and actionable.

- Sleep debt: {debt:.1f} hours
- Recommended sleep: {recommended:.1f} hours
- Recovery plan: add {extra_hours:.1f} hours for {nights} nights
- Trend: {trend} (improving/stable/worsening)
- Stress level: {stress}/10
- Health conditions: {conditions}
- Circadian type: {circadian}
- External factors: {external}

Include a motivational tone if trend is improving. If stress is high, suggest a relaxation technique. If relevant, mention sleep hygiene.
"""
    resp = await call_ai_with_fallback(prompt, max_tokens=150, preferred_model="haiku")
    if resp:
        return resp.strip()
    # Fallback tip
    return f"Try to go to bed {extra_hours:.1f} hours earlier for the next {nights} nights to recover."

# ------------------------------------------------------------------
# Trend analysis (3.4)
# ------------------------------------------------------------------
def analyze_trend(history: List[SleepEntry], recommended: float) -> str:
    if len(history) < 3:
        return "stable"
    # Simple linear regression on last 3 entries
    recent = history[-3:]
    avg_recent = sum(e.hours for e in recent) / 3
    avg_older = sum(e.hours for e in history[:-3]) / max(1, len(history)-3) if len(history) > 3 else avg_recent
    if avg_recent > avg_older * 1.05:
        return "improving"
    elif avg_recent < avg_older * 0.95:
        return "worsening"
    else:
        return "stable"

# ------------------------------------------------------------------
# Predictive health impact logging (8.1, 8.2, 8.3)
# ------------------------------------------------------------------
async def log_predictive_insights(profile: Optional[Dict], debt: float, recommended: float):
    if not profile:
        return
    prompt = f"""Estimate the long-term health impact of chronic sleep debt of {debt:.1f}h for this user.
Return a JSON with:
- "diabetes_risk_increase": 0-100
- "cardiac_risk_increase": 0-100
- "insomnia_risk": 0-100
- "optimal_bedtime": "HH:MM" based on wake time (assume wake at 7am)

User profile: age {profile.get('age')}, gender {profile.get('gender')}, conditions {profile.get('health_conditions')}
"""
    resp = await call_ai_with_fallback(prompt, max_tokens=200, preferred_model="gemini")
    if resp:
        logger.info(f"Predictive insights for user: {resp}")
    # No output, just logging

# ------------------------------------------------------------------
# Original fallback functions
# ------------------------------------------------------------------
def fallback_recommended() -> float:
    return DEFAULT_RECOMMENDED_SLEEP

def fallback_recovery(debt: float) -> Tuple[int, float]:
    nights = min(int(math.ceil(debt / 1.5)), 10) if debt > 0 else 0
    return nights, DEFAULT_RECOMMENDED_SLEEP + 1.5

def fallback_tip(nights: int) -> str:
    return f"Go to bed 1.5 hours earlier for the next {nights} nights to recover."

# ------------------------------------------------------------------
# Main endpoint
# ------------------------------------------------------------------
@router.post("")
async def sleep_debt(body: SleepDebtRequest):
    """
    Calculate cumulative sleep debt and a personalized recovery plan.
    """
    logger.info(f"Sleep debt request for user {body.userId} (model {MODEL_VERSION})")

    # Validate
    try:
        body.sleepHistory
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Cache key
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # Handle empty history
    if not body.sleepHistory:
        response = {
            "userId": body.userId,
            "totalDebtHours": 0,
            "daysAnalyzed": 0,
            "averageSleep": 0,
            "recoveryPlan": {
                "nightsNeeded": 0,
                "targetHoursPerNight": DEFAULT_RECOMMENDED_SLEEP + 1.5,
                "tip": "No sleep data provided."
            }
        }
        cache[cache_key] = response
        return response

    # Fetch user profile
    profile = await fetch_user_profile(body.userId)

    # External data
    external = {}
    if profile and profile.get('location'):
        lat = profile['location']['lat']
        lon = profile['location']['lon']
        city = profile['location']['city']
        external['seasonal_adj'] = await get_seasonal_effect(lat, lon)
        external['dst'] = await is_daylight_saving()
        external['sun'] = await get_sun_times(lat, lon)
        external['noise'] = await get_noise_level(city)
        external['air_quality'] = await get_air_quality(city)
    else:
        external = {}

    # 1. Personalised recommended sleep
    recommended = await get_personalized_recommended_sleep(profile)
    logger.info(f"Personalized recommended sleep: {recommended}")

    # 2. Weighted debt calculation
    total_debt = compute_weighted_debt(body.sleepHistory, recommended)
    logger.info(f"Weighted debt: {total_debt}")

    # 3. Recovery capacity
    extra_hours, max_nights = await predict_recovery_capacity(profile, total_debt)
    nights_needed = min(int(math.ceil(total_debt / extra_hours)), max_nights) if total_debt > 0 else 0
    target_per_night = recommended + extra_hours

    # 4. Trend
    trend = analyze_trend(body.sleepHistory, recommended)

    # 5. Generate personalized tip
    tip = await generate_personalized_tip(profile, total_debt, trend, recommended, extra_hours, nights_needed, external)
    if not tip:
        tip = fallback_tip(nights_needed)

    # 6. Log predictive insights (async, don't wait)
    asyncio.create_task(log_predictive_insights(profile, total_debt, recommended))

    # 7. Log internal analytics (5.1, 5.2, 5.3)
    logger.info(f"Debt breakdown: {[{'date': e.date, 'debt': max(0, recommended - e.hours)} for e in body.sleepHistory]}")
    logger.info(f"Data source: recommended from {'AI' if profile else 'heuristic'}, recovery from AI")

    # Compute average sleep (original field)
    avg_sleep = sum(e.hours for e in body.sleepHistory) / len(body.sleepHistory)

    # Construct response (exact same structure)
    response = {
        "userId": body.userId,
        "totalDebtHours": round(total_debt, 1),
        "daysAnalyzed": len(body.sleepHistory),
        "averageSleep": round(avg_sleep, 1),
        "recoveryPlan": {
            "nightsNeeded": nights_needed,
            "targetHoursPerNight": round(target_per_night, 1),
            "tip": tip,
        },
    }

    # Cache
    cache[cache_key] = response

    logger.info(f"Sleep debt completed for {body.userId}")
    return response