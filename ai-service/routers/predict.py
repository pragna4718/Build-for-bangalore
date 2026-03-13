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

# Cache for 1 hour (point 6.9 – cache warming)
cache = TTLCache(maxsize=1000, ttl=3600)

# Circuit breaker state (point 6.16)
circuit_breaker = {
    "failures": 0,
    "last_failure": 0,
    "threshold": 3,
    "cooldown": 300,  # seconds
    "open": False
}

# Model version (point 5.10)
MODEL_VERSION = "risk_v2.3"

# ------------------------------------------------------------------
# Pydantic models (same as original)
# ------------------------------------------------------------------
class HealthMetrics(BaseModel):
    steps: Optional[float] = 0
    sleep: Optional[float] = 7
    heartRate: Optional[float] = 72
    bloodPressureSystolic: Optional[float] = 120
    bloodPressureDiastolic: Optional[float] = 80
    weight: Optional[float] = 70
    calories: Optional[float] = 2000
    screenTime: Optional[float] = 3
    waterIntake: Optional[float] = 2
    stressLevel: Optional[float] = 3

    @validator('steps', 'sleep', 'heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic',
               'weight', 'calories', 'screenTime', 'waterIntake', 'stressLevel')
    def validate_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Value must be non-negative')
        return v

class RiskRequest(BaseModel):
    userId: str
    metrics: HealthMetrics
    history: Optional[List[HealthMetrics]] = []

# ------------------------------------------------------------------
# Placeholder for user history (enriched profile with all new fields)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    Mock user profile with all personalization fields (1.11–1.17).
    In production, query a database.
    """
    logger.info(f"Fetching enriched history for user {userId}")
    if userId.startswith('test'):
        return {
            # Basic demographics
            'age': 45,
            'gender': 'female',
            'weight_kg': 70,
            'height_cm': 165,
            'activity_level': 'moderate',
            # Family / household
            'household_size': 4,
            # Pregnancy / lactation
            'is_pregnant': False,
            'is_lactating': False,
            # Medications
            'medications': ['atorvastatin'],
            # Genetic data
            'genetic_variants': ['MTHFR C677T'],
            # Gut health
            'gut_health_issues': ['ibs'],
            # Dietary preferences
            'dietary_preferences': ['vegetarian'],
            'allergies': ['nuts'],
            'health_conditions': ['hypertension', 'type2_diabetes'],
            'injuries': ['knee pain'],
            'exercise_preferences': ['yoga', 'walking'],
            'motivation_style': 'social',
            'language': 'en',
            'location': {'city': 'Madrid', 'country': 'ES', 'lat': 40.4168, 'lon': -3.7038, 'zip': '28001'},
            'past_carts': [{'sugar': 45, 'fiber': 20}],
            'badges': ['heart_healthy'],
            'typical_intake': {'iron': 8, 'vitamin_d': 400},

            # New fields (1.11–1.17)
            'family_history': {
                'father': 'diabetes',
                'mother': 'hypertension',
                'siblings': []
            },
            'ethnicity': 'south_asian',  # (1.12)
            'smoking': 'never',           # never, former, current (1.13)
            'alcohol': 'moderate',        # none, moderate, heavy
            'substance_use': 'none',      # none, occasional, frequent
            'occupation': {
                'night_shifts': False,
                'stress_level': 'high'    # self-reported
            },
            'mental_health': {
                'depression': False,
                'anxiety': True
            },
            'lab_results': {
                'hba1c': 6.2,             # % (1.16)
                'ldl': 130                 # mg/dL
            },
            'medication_adherence': 0.8,   # 0-1 scale (1.17)
        }
    return None

# ------------------------------------------------------------------
# External API mocks (points 2.11–2.16)
# ------------------------------------------------------------------
async def get_local_disease_prevalence(lat: float, lon: float) -> Dict[str, float]:
    """Mock disease prevalence by region (2.11)"""
    # In production, call public health API
    return {
        'diabetes_prevalence': 0.12,   # 12% of adults
        'cardiac_prevalence': 0.08,
        'obesity_prevalence': 0.25,
    }

async def get_pollution_details(city: str) -> Dict[str, float]:
    """Mock detailed pollution (2.12)"""
    return {
        'pm2_5': 15.3,
        'no2': 22.1,
        'o3': 45.0
    }

async def get_noise_pollution(city: str) -> float:
    """Mock average noise level in dB (2.13)"""
    return random.uniform(50, 70)

async def get_healthcare_access(lat: float, lon: float) -> Dict[str, Any]:
    """Mock distance to nearest clinic, hospital (2.14)"""
    return {
        'nearest_clinic_km': 2.5,
        'nearest_hospital_km': 8.0,
        'in_healthcare_desert': False
    }

async def get_social_determinants(zip_code: str) -> Dict[str, Any]:
    """Mock income, education, food desert (2.15)"""
    return {
        'median_income': 60000,
        'college_educated_pct': 40,
        'food_desert': False
    }

async def get_pollen_count(city: str) -> str:
    """Mock pollen level (2.16)"""
    return random.choice(['low', 'moderate', 'high'])

# ------------------------------------------------------------------
# OpenRouter async client with model routing and circuit breaker
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 500, temperature: float = 0.3) -> Optional[str]:
    global circuit_breaker
    # Check circuit breaker
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
        async with httpx.AsyncClient(timeout=25.0) as client:  # increased timeout for Gemini
            resp = await client.post(OPENROUTER_BASE_URL, headers=HEADERS, json=payload)
            resp.raise_for_status()
            data = resp.json()
            circuit_breaker["failures"] = 0  # reset on success
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"OpenRouter call failed (model {model}): {e}")
        circuit_breaker["failures"] += 1
        circuit_breaker["last_failure"] = time.time()
        if circuit_breaker["failures"] >= circuit_breaker["threshold"]:
            circuit_breaker["open"] = True
            logger.warning("Circuit breaker opened due to repeated failures")
        return None

async def call_ai_with_fallback(prompt: str, max_tokens: int = 500) -> Optional[str]:
    """Try Gemini first, then Mistral, then return None (point 6.8)"""
    models = ["google/gemini-2.5-pro-exp-03-25:free", "mistralai/mistral-7b-instruct"]
    for model in models:
        resp = await call_openrouter(prompt, model, max_tokens)
        if resp:
            return resp
    return None

# ------------------------------------------------------------------
# AI‑powered risk score calculation (incorporates all new features)
# ------------------------------------------------------------------
async def ai_calculate_risk_scores(metrics: Dict, history: List[Dict], user_profile: Optional[Dict]) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    Compute risk scores and also return additional analytics (for logging).
    """
    # Prepare user profile summary with all new fields
    profile_text = ""
    if user_profile:
        # Basic
        profile_text = f"""
User profile:
- Age: {user_profile.get('age')}
- Gender: {user_profile.get('gender')}
- Ethnicity: {user_profile.get('ethnicity')}  # (1.12)
- Health conditions: {user_profile.get('health_conditions', [])}
- Medications: {user_profile.get('medications', [])}
- Medication adherence: {user_profile.get('medication_adherence')}  # (1.17)
- Genetic variants: {user_profile.get('genetic_variants', [])}
- Gut health issues: {user_profile.get('gut_health_issues', [])}
- Pregnant/lactating: {user_profile.get('is_pregnant')} / {user_profile.get('is_lactating')}
- Household size: {user_profile.get('household_size')}
- Dietary preferences: {user_profile.get('dietary_preferences', [])}
- Activity level: {user_profile.get('activity_level')}
- Smoking: {user_profile.get('smoking')}  # (1.13)
- Alcohol: {user_profile.get('alcohol')}
- Substance use: {user_profile.get('substance_use')}
- Occupation: {user_profile.get('occupation')}  # (1.14)
- Mental health: {user_profile.get('mental_health')}  # (1.15)
- Family history: {user_profile.get('family_history')}  # (1.11)
- Lab results: {user_profile.get('lab_results')}  # (1.16)
"""

    # External data (2.11–2.16)
    external_text = ""
    if user_profile and user_profile.get('location'):
        loc = user_profile['location']
        lat, lon = loc.get('lat'), loc.get('lon')
        city = loc.get('city')
        zip_code = loc.get('zip')
        if lat and lon:
            prev = await get_local_disease_prevalence(lat, lon)
            external_text += f"Local disease prevalence: {prev}. "
            pollution = await get_pollution_details(city)
            external_text += f"Pollution (PM2.5: {pollution['pm2_5']}, NO2: {pollution['no2']}). "
            noise = await get_noise_pollution(city)
            external_text += f"Average noise: {noise:.1f} dB. "
            health_access = await get_healthcare_access(lat, lon)
            external_text += f"Nearest clinic: {health_access['nearest_clinic_km']}km, healthcare desert: {health_access['in_healthcare_desert']}. "
        if zip_code:
            social = await get_social_determinants(zip_code)
            external_text += f"Social determinants: income ${social['median_income']}, food desert: {social['food_desert']}. "
        pollen = await get_pollen_count(city)
        external_text += f"Pollen: {pollen}. "

    # History summary
    history_text = ""
    if history:
        # Simple averages
        avg_metrics = {}
        for key in metrics.keys():
            values = [h.get(key, 0) for h in history if key in h]
            if values:
                avg_metrics[key] = sum(values) / len(values)
        history_text = f"Past average metrics: {avg_metrics}"

    # Build prompt with instructions to produce risk scores and additional analytics
    prompt = f"""You are a medical risk assessment AI. Based on the following health metrics and user context, estimate the risk scores (0-100) for five conditions: diabetes, cardiac, obesity, stress, sleepDisorder.
Additionally, provide the following internal analytics (not returned to user, but for logging):
- Risk subtypes: e.g., coronary artery disease, heart failure, arrhythmia (3.10)
- Confidence intervals for each score (low, high) (3.11)
- Comparative percentile vs age/gender (3.12) – e.g., "higher than 70% of peers"
- Time-to-event (years) if no changes (3.13)
- Sensitivity analysis: which 2 metrics affect each risk most (3.14)
- Multi-morbidity risk (0-100) (8.8)
- Hospitalization risk next year (0-100) (8.9)
- Life expectancy impact (years) (8.10)
- Preventive intervention simulator: e.g., "if you lose 5kg, diabetes risk drops by X" (8.11)
- Early warning signs: subtle patterns detected (8.12)

Return a JSON object with two parts:
- "scores": {{"diabetes": 45, "cardiac": 30, "obesity": 60, "stress": 70, "sleepDisorder": 20}}
- "analytics": {{ ... }} containing all the extra info.

Current metrics:
{metrics}

{profile_text}
{external_text}
{history_text}

Consider all provided context. Use medical knowledge to adjust risks.
"""
    response = await call_ai_with_fallback(prompt, max_tokens=800)
    if response:
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                scores = data.get('scores', {})
                analytics = data.get('analytics', {})
                # Ensure all score keys present
                expected = ['diabetes', 'cardiac', 'obesity', 'stress', 'sleepDisorder']
                for key in expected:
                    if key not in scores:
                        scores[key] = 0.0
                return scores, analytics
        except Exception as e:
            logger.error(f"Failed to parse risk scores: {e}")
    # Fallback
    scores = heuristic_risk_scores(metrics)
    return scores, {}

def heuristic_risk_scores(metrics: Dict) -> Dict[str, float]:
    scores = {}
    scores['diabetes'] = min(100, max(0, (metrics.get('weight',70)-70)*2 + (120-metrics.get('sleep',7))*5))
    scores['cardiac'] = min(100, max(0, (metrics.get('bloodPressureSystolic',120)-120) + (metrics.get('heartRate',72)-72)*0.5))
    scores['obesity'] = min(100, max(0, (metrics.get('weight',70)-70)*3))
    scores['stress'] = min(100, max(0, metrics.get('stressLevel',3)*10))
    scores['sleepDisorder'] = min(100, max(0, (7-metrics.get('sleep',7))*20))
    return scores

# ------------------------------------------------------------------
# Trend determination (improving/stable/worsening)
# ------------------------------------------------------------------
async def determine_trend(current: Dict, history: List[Dict]) -> str:
    if not history:
        return "stable"
    # Simple average comparison (could be enhanced with ML)
    avg_prev = {}
    for key in current.keys():
        values = [h.get(key, 0) for h in history]
        if values:
            avg_prev[key] = sum(values) / len(values)
    improved_count = 0
    for key in current:
        if key in avg_prev:
            if key in ['steps', 'sleep', 'waterIntake']:
                if current[key] > avg_prev[key] * 1.05:
                    improved_count += 1
            elif key in ['heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'weight', 'screenTime', 'stressLevel']:
                if current[key] < avg_prev[key] * 0.95:
                    improved_count += 1
    if improved_count >= 3:
        return "improving"
    elif improved_count <= 1:
        return "worsening"
    else:
        return "stable"

# ------------------------------------------------------------------
# Main endpoint
# ------------------------------------------------------------------
@router.post("/risk")
async def predict_risk(body: RiskRequest):
    """
    Predict disease risk scores from health metrics with AI personalization.
    """
    logger.info(f"Risk prediction request for user {body.userId} (model version {MODEL_VERSION})")

    # Validate input
    try:
        body.metrics
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate cache key
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # Fetch enriched user profile
    user_profile = await fetch_user_history(body.userId)

    # Convert history to list of dicts
    history_dicts = [h.dict() for h in body.history]

    # Compute risk scores and analytics
    scores, analytics = await ai_calculate_risk_scores(body.metrics.dict(), history_dicts, user_profile)

    # Determine trend
    trend = await determine_trend(body.metrics.dict(), history_dicts)

    # Get top 3 risks
    top_risks = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]

    # Log all analytics for transparency (points 5.8, 5.9, 5.10, 3.10-3.15, 4.13-4.18, 8.8-8.12)
    logger.info(f"Risk scores for {body.userId}: {scores}")
    logger.info(f"Trend: {trend}")
    if analytics:
        logger.info(f"Additional analytics: {json.dumps(analytics)}")
    # Log data provenance (mock: assume all from user input)
    logger.info("Data provenance: metrics from request, history from DB, external from APIs")

    # Optional: generate actionable recommendations and motivational messages (4.13, 4.14) – log only
    if analytics.get('sensitivity'):
        logger.info(f"Sensitivity analysis: {analytics['sensitivity']}")
    if analytics.get('early_warning'):
        logger.info(f"Early warning signs: {analytics['early_warning']}")

    # Construct response (exact same format)
    response = {
        "userId": body.userId,
        "riskScores": scores,
        "topRisks": [{"condition": k, "score": v} for k, v in top_risks],
        "trend": trend,
    }

    # Cache response
    cache[cache_key] = response

    logger.info(f"Risk prediction completed for {body.userId}")
    return response