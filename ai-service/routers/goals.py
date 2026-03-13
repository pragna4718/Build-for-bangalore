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

# Configure logging (point 16)
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

# Cache for 1 hour (point 13)
cache = TTLCache(maxsize=1000, ttl=3600)

# ------------------------------------------------------------------
# Enhanced Pydantic model with validation (point 15)
# ------------------------------------------------------------------
class GoalRequest(BaseModel):
    userId: str
    goalDescription: str            # e.g. "lose 5 kg in 3 months"
    currentWeightKg: Optional[float] = 70
    targetWeightKg: Optional[float] = None
    targetWeeks: Optional[int] = 12
    currentSteps: Optional[float] = 6000
    currentSleepHours: Optional[float] = 7

    @validator('targetWeeks')
    def validate_weeks(cls, v):
        if v is not None and v <= 0:
            raise ValueError('targetWeeks must be positive')
        return v

    @validator('targetWeightKg')
    def validate_weight_loss(cls, v, values):
        if v is not None and 'currentWeightKg' in values:
            if v >= values['currentWeightKg']:
                raise ValueError('targetWeightKg must be less than currentWeightKg for weight loss')
        return v

# ------------------------------------------------------------------
# Placeholder for user history (points 3,5,9,20)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for past goals, adherence, health conditions.
    Returns a dict with user profile and history.
    """
    logger.info(f"Fetching history for user {userId}")
    # Mock implementation
    if userId.startswith('test'):
        return {
            'age': 35,
            'gender': 'female',
            'conditions': ['hypertension'],  # point 9
            'language': 'es',                # point 10
            'past_goals': [
                {'goal': 'lose 5 kg', 'adherence': 0.7, 'avg_steps_increase': 1500},
                {'goal': 'walk more', 'adherence': 0.9, 'avg_steps_increase': 2000},
            ],
            'preferred_focus': 'steps',      # point 20
        }
    return None

# ------------------------------------------------------------------
# OpenRouter async client (point 14)
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 1000, temperature: float = 0.3) -> Optional[str]:
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
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"OpenRouter call failed (model {model}): {e}")
        return None

# ------------------------------------------------------------------
# AI‑powered goal interpretation (point 1)
# ------------------------------------------------------------------
async def parse_goal_description(description: str) -> Dict[str, Any]:
    """
    Extract targetWeightKg and targetWeeks from goalDescription.
    Returns dict with keys: targetWeightKg (float or None), targetWeeks (int or None).
    """
    prompt = f"""You are a health goal interpreter. Given a goal description, extract the target weight in kg and number of weeks if mentioned.
Return a JSON object with fields "targetWeightKg" (float or null) and "targetWeeks" (int or null).
If the goal does not specify a weight target, set targetWeightKg to null. If no time frame, set targetWeeks to null.
Example: "lose 5 kg in 3 months" -> {{"targetWeightKg": 5, "targetWeeks": 12}}.
Description: "{description}"
"""
    response = await call_openrouter(prompt, model="google/gemini-2.5-pro-exp-03-25:free", max_tokens=100)
    if response:
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                # Ensure types
                if 'targetWeightKg' in data and data['targetWeightKg'] is not None:
                    data['targetWeightKg'] = float(data['targetWeightKg'])
                if 'targetWeeks' in data and data['targetWeeks'] is not None:
                    data['targetWeeks'] = int(data['targetWeeks'])
                return data
        except Exception as e:
            logger.error(f"Failed to parse goal interpretation: {e}")
    return {'targetWeightKg': None, 'targetWeeks': None}

# ------------------------------------------------------------------
# AI‑powered plan generation (points 2,4,5,6,7,8,9,10,11,12,18,19,20)
# ------------------------------------------------------------------
async def ai_generate_plan(body: GoalRequest, history: Optional[Dict]) -> Optional[Dict]:
    """
    Generate the full plan (milestones and weekly tip) using AI.
    Returns dict with 'milestones' (list), 'weeklyTip' (str), 'confidence' (float), and optionally 'explanations' (internal).
    """
    # Determine if weight loss or generic
    is_weight_loss = body.targetWeightKg is not None and body.currentWeightKg is not None

    # Prepare history summary for prompt
    history_summary = ""
    if history:
        conditions = history.get('conditions', [])
        past_adherence = history.get('past_goals', [])
        language = history.get('language', 'en')
        preferred_focus = history.get('preferred_focus', '')
        history_summary = f"""
User profile:
- Age: {history.get('age')}
- Gender: {history.get('gender')}
- Health conditions: {conditions}
- Preferred language: {language}
- Preferred focus type: {preferred_focus}
- Past goal adherence: {past_adherence}
"""
    else:
        language = 'en'

    weeks = body.targetWeeks or 12

    if is_weight_loss:
        total_loss = body.currentWeightKg - body.targetWeightKg
        weekly_loss = total_loss / weeks
        # Safety check: if weekly loss > 1 kg, log warning (point 8)
        if weekly_loss > 1.0:
            logger.warning(f"Unsafe weight loss rate: {weekly_loss:.2f} kg/week for user {body.userId}")

        prompt = f"""You are a health coach AI. Create a personalized weekly milestone plan for a user with the following goal:
Goal: {body.goalDescription}
Target: lose {total_loss:.1f} kg in {weeks} weeks.
Current weight: {body.currentWeightKg} kg.
Current steps per day: {body.currentSteps}.
Current sleep hours: {body.currentSleepHours}.

{history_summary}

For each week from 1 to {weeks}, generate:
- week: the week number
- targetWeightKg: the expected weight at the end of that week (decreasing gradually, ensure safe rate <=1kg/week)
- stepsTarget: daily steps goal for that week (personalized based on history, starting from {body.currentSteps}, max 12000)
- caloriesToBurn: daily calorie deficit needed (based on weekly loss, e.g., {int(weekly_loss * 7700 / 7)} kcal/day as a guide)
- focus: a short, motivating, actionable focus for that week (1 sentence). It may include specific exercises or habits, and should be in {language} language.

Also generate a weeklyTip: a single sentence of general advice for the whole plan, in {language} language.

Return a JSON object with:
{{
  "milestones": [list of objects with fields week, targetWeightKg, stepsTarget, caloriesToBurn, focus],
  "weeklyTip": "string",
  "confidence": 0.0-1.0 (your confidence in this plan),
  "explanations": "short reasoning for key decisions (optional, for internal use)"
}}
Ensure targets are realistic and safe. Use the user's history to adjust increments. If history shows poor adherence, make increments smaller.
"""
    else:
        prompt = f"""You are a health coach AI. Create a personalized weekly milestone plan for a user with the following goal:
Goal: {body.goalDescription}
Current steps per day: {body.currentSteps}
Current sleep hours: {body.currentSleepHours}
Weeks: {weeks}

{history_summary}

For each week from 1 to {weeks}, generate:
- week: the week number
- stepsTarget: daily steps goal for that week (personalized, starting from {body.currentSteps}, max 12000)
- sleepTarget: target sleep hours for that week (personalized, starting from {body.currentSleepHours}, max 9)
- focus: a short, motivating, actionable focus for that week (1 sentence). It may include specific habits, and should be in {language} language.

Also generate a weeklyTip: a single sentence of general advice for the whole plan, in {language} language.

Return a JSON object with:
{{
  "milestones": [list of objects with fields week, stepsTarget, sleepTarget, focus],
  "weeklyTip": "string",
  "confidence": 0.0-1.0 (your confidence in this plan),
  "explanations": "short reasoning for key decisions (optional, for internal use)"
}}
"""

    response = await call_openrouter(prompt, model="google/gemini-2.5-pro-exp-03-25:free", max_tokens=2000, temperature=0.3)
    if response:
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                # Validate required fields
                if 'milestones' in data and isinstance(data['milestones'], list) and 'weeklyTip' in data:
                    # Log explanations and confidence (points 11,18)
                    if 'explanations' in data:
                        logger.info(f"Plan explanation: {data['explanations']}")
                    if 'confidence' in data:
                        logger.info(f"Plan confidence: {data['confidence']}")
                    return data
        except Exception as e:
            logger.error(f"Failed to parse AI plan: {e}")
    return None

# ------------------------------------------------------------------
# Heuristic fallback (point 17)
# ------------------------------------------------------------------
def heuristic_plan(body: GoalRequest) -> Dict:
    milestones = []
    weeks = body.targetWeeks or 12

    if body.targetWeightKg and body.currentWeightKg:
        total_loss = body.currentWeightKg - body.targetWeightKg
        weekly_loss = total_loss / weeks
        for w in range(1, weeks + 1):
            target = round(body.currentWeightKg - weekly_loss * w, 1)
            steps_target = int(body.currentSteps + (w * 200))
            milestones.append({
                "week": w,
                "targetWeightKg": target,
                "stepsTarget": min(steps_target, 12000),
                "caloriesToBurn": int(weekly_loss * 7700 / 7),
                "focus": _weekly_focus(w),
            })
    else:
        for w in range(1, weeks + 1):
            milestones.append({
                "week": w,
                "focus": _weekly_focus(w),
                "stepsTarget": min(int(body.currentSteps + w * 300), 12000),
                "sleepTarget": min(body.currentSleepHours + (0.1 * w), 8.5),
            })

    return {
        "milestones": milestones,
        "weeklyTip": "Consistency beats intensity. Small daily improvements compound.",
        "confidence": 0.0,
    }

def _weekly_focus(week: int) -> str:
    focuses = [
        "Establish baseline habits", "Increase daily steps", "Improve sleep schedule",
        "Introduce strength training", "Optimize nutrition", "Stress management",
        "Hydration focus", "Recovery and rest", "Cardio improvement",
        "Habit consolidation", "Performance assessment", "Final push & celebrate!",
    ]
    return focuses[(week - 1) % len(focuses)]

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def goal_plan(body: GoalRequest):
    """
    Generate a weekly milestone plan for a user's health goal using AI.
    """
    logger.info(f"Goal plan request for user {body.userId}: {body.goalDescription}")

    # 1. Validate (Pydantic does automatically, but catch)
    try:
        # trigger validation
        body.targetWeeks
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. AI‑powered goal interpretation if fields missing (point 1)
    updated_body = body.dict()
    if body.targetWeightKg is None or body.targetWeeks is None:
        parsed = await parse_goal_description(body.goalDescription)
        if parsed.get('targetWeightKg') is not None and body.targetWeightKg is None:
            updated_body['targetWeightKg'] = parsed['targetWeightKg']
            logger.info(f"Parsed targetWeightKg: {parsed['targetWeightKg']}")
        if parsed.get('targetWeeks') is not None and body.targetWeeks is None:
            updated_body['targetWeeks'] = parsed['targetWeeks']
            logger.info(f"Parsed targetWeeks: {parsed['targetWeeks']}")
        # Create a new GoalRequest object from updated dict? We'll just use a dict for AI call, but careful with types.
        # We'll create a new object for consistency, but it's simpler to use a dict for AI and fallback.
        # We'll create a temporary object for AI call.
        temp_body = GoalRequest(**updated_body)
    else:
        temp_body = body

    # 3. Generate cache key (point 13)
    cache_data = temp_body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # 4. Fetch user history (points 3,5,9,20)
    history = await fetch_user_history(temp_body.userId)

    # 5. AI plan generation
    ai_result = await ai_generate_plan(temp_body, history)

    if ai_result is None:
        logger.warning("AI plan generation failed, falling back to heuristic")
        ai_result = heuristic_plan(temp_body)

    # 6. Construct response (exact same format)
    response = {
        "userId": temp_body.userId,
        "goalDescription": temp_body.goalDescription,
        "totalWeeks": temp_body.targetWeeks or 12,
        "milestones": ai_result['milestones'],
        "weeklyTip": ai_result['weeklyTip'],
        "confidence": ai_result.get('confidence', 0.0),
    }

    # 7. Cache response
    cache[cache_key] = response

    # 8. Log outcome (point 16)
    logger.info(f"Goal plan generated for {temp_body.userId}: {len(response['milestones'])} weeks, tip: {response['weeklyTip']}")

    return response