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

# Configure logging (point 8.3, 9.1)
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

# Cache for 1 hour (point 6.3 – batch/cache)
cache = TTLCache(maxsize=1000, ttl=3600)

# Simplified nutrition database (kept as fallback)
NUTRITION_DB = {
    "apple":       {"calories": 52,  "sugar": 10, "fiber": 2.4, "fat": 0.2, "protein": 0.3},
    "banana":      {"calories": 89,  "sugar": 12, "fiber": 2.6, "fat": 0.3, "protein": 1.1},
    "bread":       {"calories": 265, "sugar": 5,  "fiber": 2.7, "fat": 3.2, "protein": 9.0},
    "milk":        {"calories": 61,  "sugar": 5,  "fiber": 0,   "fat": 3.3, "protein": 3.2},
    "chicken":     {"calories": 165, "sugar": 0,  "fiber": 0,   "fat": 3.6, "protein": 31},
    "rice":        {"calories": 130, "sugar": 0,  "fiber": 0.4, "fat": 0.3, "protein": 2.7},
    "default":     {"calories": 100, "sugar": 5,  "fiber": 1,   "fat": 2,   "protein": 3},
}

# ------------------------------------------------------------------
# Pydantic models with validation
# ------------------------------------------------------------------
class GroceryItem(BaseModel):
    name: str
    quantity_g: Optional[float] = 100

    @validator('quantity_g')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

class GroceryAnalyzeRequest(BaseModel):
    userId: str
    items: List[GroceryItem]


class GroceryImageAnalyzeRequest(BaseModel):
    image: str
    userId: Optional[str] = "guest"

# ------------------------------------------------------------------
# Placeholder for user history (points 1.1–1.5, 2.1, 2.3, 7.3)
# ------------------------------------------------------------------
async def fetch_user_history(userId: str) -> Optional[Dict]:
    """
    In a real implementation, query a database for user profile and past grocery carts.
    Returns dict with demographics, preferences, health conditions, etc.
    """
    logger.info(f"Fetching history for user {userId}")
    # Mock implementation
    if userId.startswith('test'):
        return {
            'age': 45,
            'gender': 'female',
            'weight_kg': 70,
            'height_cm': 165,
            'activity_level': 'moderate',  # sedentary, light, moderate, active
            'dietary_preferences': ['vegetarian'],  # vegetarian, vegan, keto, etc. (1.2)
            'allergies': ['nuts'],          # (1.3 adapted)
            'health_conditions': ['hypertension'],  # (1.4 adapted)
            'injuries': ['knee pain'],       # (1.5)
            'exercise_preferences': ['yoga', 'walking'],  # (1.3)
            'motivation_style': 'social',    # competition, social, data (1.4)
            'language': 'es',                 # for localization (7.3)
            'location': {'city': 'Madrid', 'country': 'ES'},  # for weather (2.1)
            'past_carts': [                   # for trend analysis (3.2)
                {'sugar': 45, 'fiber': 20, 'calories': 1800},
                {'sugar': 50, 'fiber': 22, 'calories': 1900},
            ],
            'badges': ['fiber_champion'],     # gamification (4.5)
        }
    return None

# ------------------------------------------------------------------
# External API mocks (points 2.1, 2.2)
# ------------------------------------------------------------------
async def get_weather(city: str, country: str) -> Optional[str]:
    """Mock weather API call – in production, call OpenWeatherMap etc."""
    # For demo, return random condition
    conditions = ["sunny", "rainy", "cloudy", "snowy"]
    import random
    return random.choice(conditions)

async def get_local_events(city: str) -> List[str]:
    """Mock local events – could integrate with Google Places API."""
    return ["Park yoga session at 10am", "Farmers market on Saturday"]

# ------------------------------------------------------------------
# OpenRouter async client with model routing (point 6.1)
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
# AI‑powered per‑item recommendations (points 1.2, 1.3, 1.5, 4.1, 4.2, 4.3, 4.4, 7.1)
# Uses Mistral for speed (point 6.1)
# ------------------------------------------------------------------
async def ai_item_recommendations(item_name: str, quantity: float, nutrition: Dict, history: Optional[Dict]) -> List[str]:
    """
    Generate personalized recommendations for a single item.
    """
    language = history.get('language', 'en') if history else 'en'
    preferences = history.get('dietary_preferences', []) if history else []
    allergies = history.get('allergies', []) if history else []
    conditions = history.get('health_conditions', []) if history else []
    injuries = history.get('injuries', []) if history else []

    prompt = f"""You are a nutritionist. Based on the following information, provide 1-3 short, actionable recommendations for this grocery item.
Return the recommendations as a JSON list of strings. Keep sentences concise and easy to read aloud (point 7.1). Write in {language} language.

Item: {item_name}
Quantity: {quantity}g
Nutrition per 100g: {nutrition}

User context:
- Dietary preferences: {preferences}
- Allergies: {allergies}
- Health conditions: {conditions}
- Injuries: {injuries}

Consider suggesting alternatives, portion adjustments, or preparation tips. If allergies are present, warn if the item might contain allergens (even if not listed, be cautious). If the item conflicts with dietary preferences, suggest substitutes.
"""
    response = await call_openrouter(prompt, model="mistralai/mistral-7b-instruct", max_tokens=300, temperature=0.2)
    if response:
        try:
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            # Fallback: split lines
            lines = [line.strip().strip('-') for line in response.split('\n') if line.strip()]
            return lines
    return []  # fallback to empty

# ------------------------------------------------------------------
# AI‑powered overall recommendation with personalization (points 1.1, 2.1, 2.4, 4.5, 4.6, 5.2, 7.3, 8.1, 8.2, 8.3)
# Uses Gemini for complex reasoning (point 6.1)
# ------------------------------------------------------------------
async def ai_overall_recommendation(total: Dict, items: List[Dict], history: Optional[Dict], weather: Optional[str]) -> str:
    """
    Generate a personalized overall cart recommendation.
    """
    language = history.get('language', 'en') if history else 'en'
    # Calculate BMR if age/gender/weight available (point 1.1)
    bmr_text = ""
    if history and history.get('age') and history.get('gender') and history.get('weight_kg'):
        # Rough Mifflin-St Jeor
        weight = history['weight_kg']
        height = history.get('height_cm', 170)
        age = history['age']
        if history['gender'].lower() == 'male':
            bmr = 10*weight + 6.25*height - 5*age + 5
        else:
            bmr = 10*weight + 6.25*height - 5*age - 161
        bmr_text = f"User's estimated BMR is {bmr:.0f} kcal/day. "

    # Activity factor (point 1.1)
    activity = history.get('activity_level', 'moderate') if history else 'moderate'
    activity_multipliers = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725}
    tdee = bmr * activity_multipliers.get(activity, 1.55) if bmr_text else None

    # Past carts trend (point 3.2)
    trend_text = ""
    if history and history.get('past_carts'):
        past = history['past_carts']
        if len(past) >= 2:
            sugar_trend = past[-1]['sugar'] - past[-2]['sugar']
            fiber_trend = past[-1]['fiber'] - past[-2]['fiber']
            trend_text = f"Compared to last cart, sugar is {'up' if sugar_trend>0 else 'down'} by {abs(sugar_trend):.1f}g, fiber is {'up' if fiber_trend>0 else 'down'} by {abs(fiber_trend):.1f}g. "

    # Gamification (point 4.5)
    badges = history.get('badges', []) if history else []
    badges_text = f"Current badges: {', '.join(badges)}. " if badges else ""

    # Weather (point 2.1)
    weather_text = f"Weather: {weather}. " if weather else ""

    # Public health guidelines (point 2.4)
    guidelines = "WHO recommends less than 50g free sugars per day, 25-30g fiber, and balanced macros."

    prompt = f"""You are a health advisor. Based on the total nutrition of this grocery cart and user context, provide ONE sentence of personalized advice.
Return only the sentence, no extra text. Write in {language} language.

Total nutrition for the cart:
- Calories: {total['calories']} kcal
- Sugar: {total['sugar']} g
- Fiber: {total['fiber']} g
- Fat: {total['fat']} g
- Protein: {total['protein']} g

{bmr_text}
User activity level: {activity}. TDEE: {tdee:.0f} kcal/day if known.
{trend_text}
{badges_text}
{weather_text}
Guidelines: {guidelines}

User health conditions: {history.get('health_conditions', []) if history else []}
Motivation style: {history.get('motivation_style', 'data') if history else 'data'}

If the cart is high in sugar or low in fiber, suggest improvements. If the user is trying to lose weight, compare calories to TDEE. If there are health conditions, tailor advice. Use a tone that matches motivation style (e.g., encouraging for social, data-driven for data).
"""
    response = await call_openrouter(prompt, model="google/gemini-2.5-pro-exp-03-25:free", max_tokens=100, temperature=0.3)
    if response:
        return response.strip()
    # Fallback
    return _overall_rec_fallback(total)

def _overall_rec_fallback(total: dict) -> str:
    if total["sugar"] > 50:
        return "This cart is high in sugar. Focus on whole foods."
    if total["fiber"] > 25:
        return "Good fiber content. Well balanced cart."
    return "Balanced cart. Ensure adequate protein and fiber daily."

# ------------------------------------------------------------------
# Fallback per-item recommendations (original logic)
# ------------------------------------------------------------------
def fallback_item_recs(nutrition: Dict) -> List[str]:
    recs = []
    if nutrition["sugar"] > 15:
        recs.append("High sugar — consider reducing portion size.")
    if nutrition["fiber"] < 2:
        recs.append("Low fiber — pair with vegetables.")
    if nutrition["fat"] > 10:
        recs.append("High fat — choose leaner alternatives.")
    return recs

# ------------------------------------------------------------------
# Main endpoint (async, with caching, logging, fallback)
# ------------------------------------------------------------------
@router.post("")
async def grocery_analyze(body: GroceryAnalyzeRequest):
    """
    Analyze grocery items for nutrition and generate personalized recommendations.
    """
    logger.info(f"Grocery analysis request for user {body.userId}")

    # Validation
    try:
        # trigger validation
        body.items
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate cache key (point 6.3)
    cache_data = body.dict()
    cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return cache[cache_key]

    # Fetch user history (points 1,2,3,4,5,7,8)
    history = await fetch_user_history(body.userId)

    # Fetch weather if location available (point 2.1)
    weather = None
    if history and history.get('location'):
        weather = await get_weather(history['location']['city'], history['location']['country'])

    # Process each item
    results = []
    total = {"calories": 0, "sugar": 0, "fiber": 0, "fat": 0, "protein": 0}

    for item in body.items:
        # Get base nutrition from DB (fallback)
        db_entry = NUTRITION_DB.get(item.name.lower(), NUTRITION_DB["default"])
        ratio = item.quantity_g / 100
        nutrition = {k: round(v * ratio, 1) for k, v in db_entry.items()}

        # AI‑powered recommendations (points 1.2,1.3,1.5,4.1-4.4,7.1)
        recs = await ai_item_recommendations(item.name, item.quantity_g, db_entry, history)
        if not recs:
            recs = fallback_item_recs(nutrition)

        results.append({
            "name": item.name,
            "quantity_g": item.quantity_g,
            "nutrition": nutrition,
            "recommendations": recs,
        })

        for k in total:
            total[k] = round(total[k] + nutrition[k], 1)

    # AI‑powered overall recommendation (points 1.1,2.1,2.4,4.5,4.6,5.2,7.3,8.1,8.2,8.3)
    overall_rec = await ai_overall_recommendation(total, results, history, weather)

    # Log explainability (point 5.1,5.3) – we could store in a database, but for now just log
    logger.info(f"Overall recommendation for {body.userId}: {overall_rec}")

    # Health risk assessment (point 8.3) – log if too aggressive
    if total["sugar"] > 100:
        logger.warning(f"Very high sugar cart for user {body.userId} – potential health risk")

    # Long‑term projection (point 8.1) – we could add a note, but for now log
    if history and history.get('past_carts'):
        # Example: if cart is consistently high sugar, predict weight gain
        pass

    # Construct response (exact same format)
    response = {
        "userId": body.userId,
        "items": results,
        "totalNutrition": total,
        "overallRecommendation": overall_rec,
    }

    # Cache response
    cache[cache_key] = response

    # Log outcome
    logger.info(f"Grocery analysis completed for {body.userId}")

    return response


@router.post("/image")
async def grocery_analyze_image(body: GroceryImageAnalyzeRequest):
    """
    Lightweight image endpoint expected by Node /api/grocery/scan-image.
    This currently returns a deterministic analysis scaffold until OCR/vision is added.
    """
    if not body.image:
        raise HTTPException(status_code=400, detail="image is required")

    items = [
        {
            "name": "Apple",
            "category": "Fruit",
            "nutrition": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4},
            "isHealthy": True,
            "healthVerdict": "Nutrient-dense whole fruit with good fiber.",
            "benefits": ["Supports gut health", "Provides antioxidants"],
        },
        {
            "name": "Whole Wheat Bread",
            "category": "Grain",
            "nutrition": {"calories": 247, "protein": 13, "carbs": 41, "fat": 4.2, "fiber": 6},
            "isHealthy": True,
            "healthVerdict": "Better choice than refined bread due to higher fiber.",
            "benefits": ["Sustained energy", "Higher micronutrients"],
        },
        {
            "name": "Potato Chips",
            "category": "Snack",
            "nutrition": {"calories": 536, "protein": 7, "carbs": 53, "fat": 35, "fiber": 4.4},
            "isHealthy": False,
            "healthVerdict": "High calorie and sodium snack; keep occasional.",
            "benefits": ["Quick energy"],
        },
    ]

    healthy_count = sum(1 for item in items if item["isHealthy"])
    total_items = len(items)
    percentage = round((healthy_count / total_items) * 100)

    return {
        "userId": body.userId,
        "items": items,
        "overallAssessment": {
            "healthyItems": healthy_count,
            "totalItems": total_items,
            "healthPercentage": percentage,
            "verdict": "Great baseline grocery mix. Reduce processed snacks for better metabolic health.",
        },
        "combinations": [
            {
                "title": "Fiber Balance",
                "reason": "Combine whole grains with fruit for better satiety and glucose stability.",
                "items": ["Whole Wheat Bread", "Apple"],
                "icon": "\ud83c\udf3f",
            }
        ],
    }