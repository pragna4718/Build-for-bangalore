from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class FoodPlateAnalyzeRequest(BaseModel):
    image: str


def _health_rating(score: int) -> Dict[str, Any]:
    if score >= 9:
        return {"score": score, "label": "Excellent", "color": "#22c55e"}
    if score >= 7:
        return {"score": score, "label": "Good", "color": "#84cc16"}
    if score >= 5:
        return {"score": score, "label": "Moderate", "color": "#eab308"}
    if score >= 3:
        return {"score": score, "label": "Fair", "color": "#f97316"}
    return {"score": score, "label": "Poor", "color": "#ef4444"}


@router.post("")
async def analyze_food_plate(body: FoodPlateAnalyzeRequest):
    """
    Lightweight endpoint expected by /api/food-plate/analyze.
    Returns deterministic nutrition analysis scaffold until model-based image detection is integrated.
    """
    if not body.image:
        raise HTTPException(status_code=400, detail="image is required")

    food = {
        "name": "Balanced Plate",
        "description": "Estimated plate with mixed carbs, lean protein, and vegetables.",
        "calories_per_serving": 420,
        "serving_size": "1 plate (300g)",
        "macros": {"protein": 20, "carbs": 48, "fat": 13, "fiber": 7, "sugar": 5},
        "vitamins": {
            "Vitamin A": "22% DV",
            "Vitamin C": "35% DV",
            "Vitamin B6": "18% DV",
            "Folate": "16% DV",
        },
        "minerals": {
            "Iron": "14% DV",
            "Potassium": "15% DV",
            "Magnesium": "10% DV",
            "Zinc": "12% DV",
        },
        "benefits": [
            "Balanced macro profile for sustained energy",
            "Good fiber for digestion",
            "Adequate protein for muscle recovery",
            "Micronutrient diversity from mixed food groups",
        ],
    }

    score = 8
    return {
        "identified": True,
        "food": food,
        "healthRating": _health_rating(score),
        "dailyIntakeAdvice": "Good overall plate. Add one extra serving of vegetables for improved fiber and micronutrient density.",
    }
