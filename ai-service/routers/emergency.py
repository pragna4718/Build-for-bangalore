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

# Configure logging (point 8)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# OpenRouter configuration (point 14 – ready for microservice extraction)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

# Cache for 5 minutes (point 9)
cache = TTLCache(maxsize=1000, ttl=300)

# Original thresholds and instructions (kept for fallback)
THRESHOLDS = {
    "heartRate":            {"low": 40,  "high": 150},
    "bloodPressureSystolic": {"low": 80,  "high": 180},
    "oxygenSaturation":     {"low": 90,  "high": 100},
}

EMERGENCY_INSTRUCTIONS = {
    "cardiac_arrest": [
        "Call 911 immediately.",
        "Begin CPR: 30 chest compressions, 2 rescue breaths.",
        "Use AED if available.",
        "Do not leave the patient alone.",
    ],
    "hypertensive_crisis": [
        "Call 911 immediately.",
        "Keep the person calm and seated.",
        "Do not give any medications unless prescribed.",
        "Monitor symptoms until help arrives.",
    ],
    "bradycardia": [
        "Call 911 if the person is unresponsive.",
        "Keep them lying down.",
        "Loosen tight clothing.",
        "Monitor breathing.",
    ],
    "hypoxia": [
        "Call 911 immediately.",
        "Sit the person upright.",
        "Use supplemental oxygen if available.",
        "Keep the person calm and still.",
    ],
}

# ------------------------------------------------------------------
# Enhanced Pydantic model with validation (point 7)
# ------------------------------------------------------------------
class VitalsRequest(BaseModel):
    userId: str
    heartRate: Optional[float] = None
    bloodPressureSystolic: Optional[float] = None
    oxygenSaturation: Optional[float] = None
    lossOfConsciousness: Optional[bool] = False

    @validator('heartRate')
    def validate_heart_rate(cls, v):
        if v is not None and (v < 0 or v > 300):
            raise ValueError('Heart rate must be between 0 and 300')
        return v

    @validator('bloodPressureSystolic')
    def validate_blood_pressure(cls, v):
        if v is not None and (v < 30 or v > 300):
            raise ValueError('Blood pressure must be between 30 and 300')
        return v

    @validator('oxygenSaturation')
    def validate_oxygen(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Oxygen saturation must be between 0 and 100')
        return v

# ------------------------------------------------------------------
# Feature engineering (point 6)
# ------------------------------------------------------------------
def engineer_features(body: VitalsRequest, history: Optional[Dict] = None) -> Dict[str, float]:
    """
    Create derived features for AI models.
    """
    features = {}
    # Normalize vitals to 0-1 based on typical ranges
    if body.heartRate is not None:
        features['heartRate_norm'] = max(0, min(1, (body.heartRate - 40) / (180 - 40)))  # rough range
    if body.bloodPressureSystolic is not None:
        features['bpSystolic_norm'] = max(0, min(1, (body.bloodPressureSystolic - 80) / (200 - 80)))
    if body.oxygenSaturation is not None:
        features['oxygen_norm'] = body.oxygenSaturation / 100
    if body.lossOfConsciousness:
        features['lossOfConsciousness'] = 1.0

    # Interaction: low oxygen + high heart rate may indicate respiratory distress
    if body.oxygenSaturation is not None and body.heartRate is not None:
        if body.oxygenSaturation < 90 and body.heartRate > 100:
            features['respiratory_distress'] = 1.0

    # Trend from history (if available)
    if history and 'baseline_hr' in history:
        if body.heartRate:
            features['hr_deviation'] = abs(body.heartRate - history['baseline_hr']) / history['baseline_hr']

    return features

# ------------------------------------------------------------------
# Placeholder for user history (point 11)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for past vitals and conditions.
    Returns baseline values or None.
    """
    logger.info(f"Fetching history for user {userId}")
    # Mock implementation for demonstration
    if userId.startswith('test'):
        return {
            'baseline_hr': 72,
            'baseline_bp': 120,
            'baseline_o2': 98,
            'conditions': ['hypertension']  # comorbidities
        }
    return None

# ------------------------------------------------------------------
# OpenRouter async client (point 10)
# ------------------------------------------------------------------
async def call_openrouter(prompt: str, model: str, max_tokens: int = 200, temperature: float = 0.3) -> Optional[str]:
    """
    Make an async call to OpenRouter API and return the response text.
    """
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
# AI‑powered emergency classification (point 1)
# ------------------------------------------------------------------
async def classify_emergency(body: VitalsRequest, features: Dict, history: Optional[Dict]) -> Optional[str]:
    """
    Use Gemini 2.5 Pro to determine the most likely emergency type.
    """
    prompt = f"""You are a medical AI. Based on the following vital signs, determine the most likely emergency condition.
Choose one from: cardiac_arrest, hypertensive_crisis, bradycardia, hypoxia, tachycardia, stroke, or none.
Return only the single word.

Patient data:
- Heart rate: {body.heartRate} bpm
- Systolic BP: {body.bloodPressureSystolic} mmHg
- Oxygen saturation: {body.oxygenSaturation}%
- Loss of consciousness: {body.lossOfConsciousness}
"""
    if history:
        prompt += f"\n- Medical history: {history.get('conditions', [])}"

    response = await call_openrouter(prompt, model="google/gemini-2.5-pro-exp-03-25:free", max_tokens=10)
    if response:
        emergency_type = response.strip().lower()
        # Validate against known types or allow new ones
        return emergency_type
    return None

# ------------------------------------------------------------------
# Dynamic, personalized emergency instructions (point 2)
# ------------------------------------------------------------------
async def generate_instructions(emergency_type: str, body: VitalsRequest, history: Optional[Dict]) -> Optional[List[str]]:
    """
    Use Claude Haiku to generate step‑by‑step instructions.
    """
    prompt = f"""You are a first aid expert. Generate a list of clear, actionable steps for a person experiencing a medical emergency.
The emergency type is: {emergency_type}.

Patient's current vitals:
- Heart rate: {body.heartRate} bpm
- Systolic BP: {body.bloodPressureSystolic} mmHg
- Oxygen saturation: {body.oxygenSaturation}%
- Loss of consciousness: {body.lossOfConsciousness}

Return the instructions as a JSON list of strings, each step concise. For example: ["Call 911.", "Start CPR."]
"""
    if history:
        prompt += f"\nThe patient has a history of: {history.get('conditions', [])}."

    response = await call_openrouter(prompt, model="anthropic/claude-3-haiku", max_tokens=300, temperature=0.2)
    if response:
        try:
            # Try to parse JSON list
            import json
            # Sometimes the model returns extra text; extract JSON part
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                instructions = json.loads(json_match.group())
                if isinstance(instructions, list):
                    return instructions
        except:
            # Fallback: split by lines
            lines = [line.strip().strip('-') for line in response.split('\n') if line.strip()]
            return lines
    return None

# ------------------------------------------------------------------
# Severity scoring (internal, point 3)
# ------------------------------------------------------------------
async def assess_severity(body: VitalsRequest) -> Optional[float]:
    """
    Use Mistral 7B to estimate severity (0-100). Internal only.
    """
    prompt = f"""Estimate the severity of the medical situation based on these vitals (0=normal, 100=critical). Return only a number.

Heart rate: {body.heartRate}
Systolic BP: {body.bloodPressureSystolic}
O2 saturation: {body.oxygenSaturation}
Loss of consciousness: {body.lossOfConsciousness}
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
# Explainability of emergency decision (internal, point 4)
# ------------------------------------------------------------------
async def explain_decision(emergency_type: str, body: VitalsRequest, history: Optional[Dict]) -> Optional[str]:
    """
    Use DeepSeek R1 to generate a short explanation.
    """
    prompt = f"""Explain in one sentence why this patient is experiencing {emergency_type} based on their vitals.

Vitals:
- Heart rate: {body.heartRate}
- Systolic BP: {body.bloodPressureSystolic}
- O2 saturation: {body.oxygenSaturation}
- Loss of consciousness: {body.lossOfConsciousness}
"""
    if history:
        prompt += f"\nMedical history: {history.get('conditions', [])}"

    response = await call_openrouter(prompt, model="deepseek/deepseek-r1:free", max_tokens=60)
    return response.strip() if response else None

# ------------------------------------------------------------------
# Predictive risk assessment (internal, point 5)
# ------------------------------------------------------------------
async def predict_risk(body: VitalsRequest, history: Optional[Dict]) -> Optional[float]:
    """
    Use Mistral 7B to predict risk of deterioration in next 30 minutes (0-100). Internal only.
    """
    prompt = f"""Predict the risk (0-100) that this patient's condition will worsen in the next 30 minutes. Return only a number.

Current vitals:
Heart rate: {body.heartRate}
Systolic BP: {body.bloodPressureSystolic}
O2 saturation: {body.oxygenSaturation}
Loss of consciousness: {body.lossOfConsciousness}
"""
    if history:
        prompt += f"\nBaseline heart rate: {history.get('baseline_hr')}"

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
# Original rule-based detection (fallback)
# ------------------------------------------------------------------
def rule_based_detection(body: VitalsRequest) -> tuple:
    """Returns (emergency, emergency_type, instructions)"""
    emergency = False
    emergency_type = None
    instructions = []

    if body.lossOfConsciousness:
        emergency = True
        emergency_type = "cardiac_arrest"
        instructions = EMERGENCY_INSTRUCTIONS["cardiac_arrest"]
    elif body.heartRate and body.heartRate > THRESHOLDS["heartRate"]["high"]:
        if body.bloodPressureSystolic and body.bloodPressureSystolic > 180:
            emergency = True
            emergency_type = "hypertensive_crisis"
            instructions = EMERGENCY_INSTRUCTIONS["hypertensive_crisis"]
        else:
            emergency = True
            emergency_type = "tachycardia"
            instructions = ["Sit down and breathe slowly.", "Call 911 if symptoms persist.", "Avoid caffeine and stimulants."]
    elif body.heartRate and body.heartRate < THRESHOLDS["heartRate"]["low"]:
        emergency = True
        emergency_type = "bradycardia"
        instructions = EMERGENCY_INSTRUCTIONS["bradycardia"]
    elif body.oxygenSaturation and body.oxygenSaturation < THRESHOLDS["oxygenSaturation"]["low"]:
        emergency = True
        emergency_type = "hypoxia"
        instructions = EMERGENCY_INSTRUCTIONS["hypoxia"]
    elif body.bloodPressureSystolic and body.bloodPressureSystolic > 180:
        emergency = True
        emergency_type = "hypertensive_crisis"
        instructions = EMERGENCY_INSTRUCTIONS["hypertensive_crisis"]

    return emergency, emergency_type, instructions

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def emergency_detect(body: VitalsRequest):
    """
    Analyse real-time vitals and detect emergency conditions using AI.
    """
    # Log request (point 8)
    logger.info(f"Emergency detection request for user {body.userId}")

    # 1. Validation (already done by Pydantic)
    # 2. Generate cache key (point 9)
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    # 3. Check cache
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # 4. Fetch user history (async) (point 11)
    history = await fetch_user_history(body.userId)

    # 5. Feature engineering (point 6)
    features = engineer_features(body, history)

    # 6. Run AI tasks concurrently (point 10)
    class_task = classify_emergency(body, features, history)           # point 1
    severity_task = assess_severity(body)                              # point 3 (internal)
    risk_task = predict_risk(body, history)                            # point 5 (internal)
    # Wait for classification first because instructions depend on it
    # But we can run all and handle later
    class_result, severity_result, risk_result = await asyncio.gather(
        class_task, severity_task, risk_task,
        return_exceptions=True
    )

    # 7. Determine emergency type and instructions
    if isinstance(class_result, Exception) or class_result is None:
        logger.warning("AI classification failed, falling back to rule-based")
        emergency, emergency_type, instructions = rule_based_detection(body)
    else:
        emergency_type = class_result
        # Always treat as emergency if we got a type (could be "none" but we'll keep logic)
        emergency = emergency_type not in [None, "none"]

        # Generate instructions using AI (point 2)
        instr_task = generate_instructions(emergency_type, body, history)
        instr_result = await instr_task  # we can await here since we already have class_result

        if isinstance(instr_result, Exception) or instr_result is None:
            # Fallback to static instructions if available, else generic
            if emergency_type in EMERGENCY_INSTRUCTIONS:
                instructions = EMERGENCY_INSTRUCTIONS[emergency_type]
            else:
                instructions = ["Call 911 immediately.", "Stay with the person.", "Monitor vitals until help arrives."]
        else:
            instructions = instr_result

    # 8. Explainability (internal, point 4)
    # Run explanation as a separate task (fire and forget? we can log it)
    explanation_task = explain_decision(emergency_type, body, history)
    # We don't need to wait for it to complete before responding, but we'll gather later if we want.
    # For simplicity, we'll just create task and not await (fire and forget)
    asyncio.create_task(explanation_task)  # log internally

    # 9. Use severity and risk internally (just log for monitoring)
    if not isinstance(severity_result, Exception) and severity_result is not None:
        logger.info(f"Severity score for {body.userId}: {severity_result}")
    if not isinstance(risk_result, Exception) and risk_result is not None:
        logger.info(f"Risk score for {body.userId}: {risk_result}")

    # 10. Construct response (exact same format)
    response = {
        "userId": body.userId,
        "emergency": emergency,
        "emergencyType": emergency_type,
        "instructions": instructions,
        "callEmergencyServices": emergency,
        "vitalsReceived": {
            "heartRate": body.heartRate,
            "bloodPressureSystolic": body.bloodPressureSystolic,
            "oxygenSaturation": body.oxygenSaturation,
        },
    }

    # 11. Cache response
    cache[cache_key] = response

    # 12. Log outcome (point 8)
    logger.info(f"Emergency result for user {body.userId}: type={emergency_type}, emergency={emergency}")

    return response