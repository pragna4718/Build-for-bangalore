import os
import json
import logging
import hashlib
import asyncio
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
import httpx
from cachetools import TTLCache

# Configure logging (point 13)
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

# Cache for 1 hour (point 14)
cache = TTLCache(maxsize=1000, ttl=3600)

# Static GI table for fallback (point 1)
GI_TABLE = {
    "white rice": 73, "brown rice": 50, "white bread": 75, "whole wheat bread": 53,
    "oats": 55, "banana": 51, "apple": 36, "sugar": 65, "potato": 78,
    "pasta": 49, "milk": 35, "default": 55,
}

# ------------------------------------------------------------------
# Enhanced Pydantic models with validation (point 12)
# ------------------------------------------------------------------
class MealItem(BaseModel):
    name: str
    quantity_g: float = 100

    @validator('quantity_g')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

class GlycemicRequest(BaseModel):
    userId: str
    meals: List[MealItem]
    diabeticRisk: Optional[float] = 0.3

    @validator('diabeticRisk')
    def validate_risk(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError('diabeticRisk must be between 0 and 1')
        return v

# ------------------------------------------------------------------
# Placeholder for user history (points 3, 8, 11)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for past meals, glucose responses, and activity.
    Returns a dict with recent data and trends.
    """
    logger.info(f"Fetching history for user {userId}")
    # Mock implementation
    if userId.startswith('test'):
        return {
            'age': 45,
            'weight_kg': 75,
            'insulin_sensitivity': 1.2,  # factor relative to average
            'recent_meals': [
                {'name': 'white rice', 'quantity': 150, 'peak': 190},
                {'name': 'apple', 'quantity': 200, 'peak': 140},
            ],
            'exercise_today': 30,  # minutes
            'trend': 'stable'  # or 'worsening'
        }
    return None

# ------------------------------------------------------------------
# OpenRouter async client (point 15)
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 300, temperature: float = 0.3) -> Optional[str]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(OPENROUTER_BASE_URL, headers=HEADERS, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"OpenRouter call failed (model {model}): {e}")
        return None

# ------------------------------------------------------------------
# AI‑powered glycemic response prediction (points 1,2,4,7,8,9,11,17,18)
# ------------------------------------------------------------------
async def ai_predict_glucose(body: GlycemicRequest, history: Optional[Dict]) -> Optional[Dict]:
    """
    Use Gemini/Mistral to estimate GI of each food, meal composition effects,
    and predict the glucose curve parameters.
    Returns dict with:
      - gi_values: list of GI for each meal item
      - peak_glucose: float
      - time_to_peak: int (minutes)
      - decay_rate: float
      - confidence: float (0-1)
      - hypoglycemia_risk: float (0-1)
      - warning_reason: str (optional)
    """
    # Build meals description
    meals_desc = "\n".join([f"- {item.name} ({item.quantity_g}g)" for item in body.meals])

    # Include history if available
    history_text = ""
    if history:
        history_text = f"""
User profile:
- Age: {history.get('age')}
- Weight: {history.get('weight_kg')} kg
- Insulin sensitivity factor: {history.get('insulin_sensitivity')}
- Exercise today: {history.get('exercise_today')} minutes
- Recent meal peaks: {history.get('recent_meals')}
- Overall trend: {history.get('trend')}
"""

    prompt = f"""You are a medical AI specializing in glucose response. For the given meal and user context, provide the following:

1. For each food item, estimate its Glycemic Index (GI) (0-100), and optionally its carbohydrate, fibre, fat, protein content per 100g (to refine absorption).
2. Based on all items, user's diabetic risk factor ({body.diabeticRisk}), and history, predict the blood glucose response after the meal. Assume a fasting baseline of 90 mg/dL.
   - Peak glucose (mg/dL)
   - Time to peak (minutes, usually 30-90)
   - Decay rate (positive number; larger = faster return to baseline)
   - Confidence in this prediction (0-1)
   - Risk of hypoglycemia (0-1) in the 2-4 hour window
   - A short warning reason if peak > 180 mg/dL (optional)

Return ONLY a JSON object with these fields:
{{
  "gi_values": [list of GI numbers in same order as meals],
  "peak_glucose": float,
  "time_to_peak": int,
  "decay_rate": float,
  "confidence": float,
  "hypoglycemia_risk": float,
  "warning_reason": "string or null"
}}

Meal items:
{meals_desc}
{history_text}
"""
    # Use Gemini for medical knowledge (point 1,2,8,18), but it's fast enough
    response = await call_openrouter(prompt, model="google/gemini-2.5-pro-exp-03-25:free", max_tokens=300, temperature=0.2)
    if response:
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                # Validate required fields
                required = ['gi_values', 'peak_glucose', 'time_to_peak', 'decay_rate', 'confidence', 'hypoglycemia_risk']
                if all(k in data for k in required):
                    return data
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
    return None

# ------------------------------------------------------------------
# Generate glucose curve from AI parameters (same shape as original)
# ------------------------------------------------------------------
def generate_curve(peak_glucose: float, time_to_peak: int, decay_rate: float, baseline: float = 90) -> List[Dict]:
    curve = []
    for t in range(0, 130, 10):
        if t <= time_to_peak:
            # Use sine rise
            glucose = baseline + (peak_glucose - baseline) * math.sin(math.pi * t / (2 * time_to_peak))
        else:
            # Exponential decay
            glucose = baseline + (peak_glucose - baseline) * math.exp(-decay_rate * (t - time_to_peak))
        curve.append({"time_min": t, "glucose_mg_dl": round(glucose, 1)})
    return curve

# ------------------------------------------------------------------
# Heuristic fallback (point 16)
# ------------------------------------------------------------------
def heuristic_prediction(body: GlycemicRequest) -> Dict:
    total_gl = sum(
        (GI_TABLE.get(item.name.lower(), GI_TABLE["default"]) * item.quantity_g / 100)
        for item in body.meals
    )
    baseline = 90
    peak_rise = total_gl * 0.8 * (1 + body.diabeticRisk * 0.5)
    peak_glucose = baseline + peak_rise
    return {
        'gi_values': [GI_TABLE.get(item.name.lower(), GI_TABLE["default"]) for item in body.meals],
        'peak_glucose': peak_glucose,
        'time_to_peak': 45,
        'decay_rate': 0.025,
        'confidence': 0.0,
        'hypoglycemia_risk': 0.0,
        'warning_reason': None,
    }

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def glycemic_curve(body: GlycemicRequest):
    """
    Model the blood glucose response curve after a meal using AI.
    """
    logger.info(f"Glycemic curve request for user {body.userId}")

    # Generate cache key (point 14)
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # Fetch user history (point 3)
    history = await fetch_user_history(body.userId)

    # AI prediction (points 1,2,4,7,8,9,11,17,18)
    ai_result = await ai_predict_glucose(body, history)

    if ai_result is None:
        logger.warning("AI prediction failed, falling back to heuristic")
        ai_result = heuristic_prediction(body)

    # Log confidence and hypoglycemia risk (points 13,17)
    logger.info(f"AI confidence: {ai_result['confidence']}, hypoglycemia risk: {ai_result['hypoglycemia_risk']}")

    # Generate curve using AI parameters
    curve = generate_curve(
        peak_glucose=ai_result['peak_glucose'],
        time_to_peak=ai_result['time_to_peak'],
        decay_rate=ai_result['decay_rate']
    )

    # Compute total glycemic load using AI gi_values (point 1)
    total_gl = sum(
        ai_result['gi_values'][i] * body.meals[i].quantity_g / 100
        for i in range(len(body.meals))
    )

    peak_glucose = max(p["glucose_mg_dl"] for p in curve)
    warning = peak_glucose > 180

    # Log warning reason if any (point 5 internal)
    if ai_result.get('warning_reason'):
        logger.info(f"Warning reason: {ai_result['warning_reason']}")

    # Construct response (exact same format)
    response = {
        "userId": body.userId,
        "curve": curve,
        "peakGlucose": peak_glucose,
        "totalGlycemicLoad": round(total_gl, 1),
        "warning": warning,
    }

    # Cache response
    cache[cache_key] = response

    logger.info(f"Glycemic result for {body.userId}: peak={peak_glucose:.1f}, warning={warning}")
    return response