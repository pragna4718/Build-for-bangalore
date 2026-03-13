from typing import Dict, List, Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthQARequest(BaseModel):
    question: str


CONDITION_DATA: Dict[str, Dict[str, Any]] = {
    "headache": {
        "condition": "Headache / Migraine",
        "description": "Headaches can be linked to dehydration, skipped meals, poor sleep, or trigger foods.",
        "foodsToEat": [
            {"name": "Water", "reason": "Hydration is the first-line support for common headaches.", "icon": "W"},
            {"name": "Banana", "reason": "Provides potassium and magnesium that support vascular function.", "icon": "B"},
            {"name": "Ginger tea", "reason": "May reduce inflammation and nausea associated with headaches.", "icon": "G"},
        ],
        "foodsToAvoid": [
            {"name": "Alcohol", "reason": "Can dehydrate and trigger headache symptoms.", "icon": "A"},
            {"name": "Highly processed meats", "reason": "Can contain additives that trigger migraines in some people.", "icon": "P"},
        ],
        "generalAdvice": "Hydrate early, eat regular meals, and track triggers in a short symptom log.",
    },
    "sleep": {
        "condition": "Sleep Issues",
        "description": "Sleep quality improves with stable routines and lower evening stimulation.",
        "foodsToEat": [
            {"name": "Warm milk", "reason": "Contains tryptophan linked to relaxation pathways.", "icon": "M"},
            {"name": "Kiwi", "reason": "Some studies associate kiwi intake with better sleep quality.", "icon": "K"},
            {"name": "Walnuts", "reason": "Contain melatonin and healthy fats that may support sleep.", "icon": "W"},
        ],
        "foodsToAvoid": [
            {"name": "Caffeine late day", "reason": "Can impair sleep onset and depth.", "icon": "C"},
            {"name": "Heavy late meals", "reason": "Can increase reflux and disturb sleep.", "icon": "H"},
        ],
        "generalAdvice": "Keep a fixed bedtime, reduce screens at night, and avoid caffeine after afternoon.",
    },
    "weight": {
        "condition": "Weight Management",
        "description": "Sustainable fat loss is mostly about consistency, protein, and a manageable calorie deficit.",
        "foodsToEat": [
            {"name": "Eggs", "reason": "High satiety protein helps reduce overall calorie intake.", "icon": "E"},
            {"name": "Leafy greens", "reason": "Low energy density with high micronutrients and fiber.", "icon": "L"},
            {"name": "Lentils", "reason": "Protein-fiber combo supports fullness.", "icon": "N"},
        ],
        "foodsToAvoid": [
            {"name": "Sugary drinks", "reason": "High calories with low satiety.", "icon": "S"},
            {"name": "Frequent fried snacks", "reason": "High fat-calorie load and low nutrient density.", "icon": "F"},
        ],
        "generalAdvice": "Build meals around protein and vegetables, then add carbs based on activity.",
    },
}

KEYWORDS: Dict[str, List[str]] = {
    "headache": ["headache", "migraine", "head pain"],
    "sleep": ["sleep", "insomnia", "cannot sleep", "cant sleep"],
    "weight": ["weight", "lose weight", "fat loss", "diet"],
}


@router.post("")
async def ask_health_question(body: HealthQARequest):
    q = body.question.lower().strip()

    for condition, words in KEYWORDS.items():
        if any(word in q for word in words):
            response = CONDITION_DATA[condition]
            return {
                "understood": True,
                "condition": response["condition"],
                "description": response["description"],
                "foodsToEat": response["foodsToEat"],
                "foodsToAvoid": response["foodsToAvoid"],
                "generalAdvice": response["generalAdvice"],
                "disclaimer": "This is general nutritional guidance, not medical diagnosis.",
            }

    return {
        "understood": False,
        "message": "I can help with food guidance for headaches, sleep issues, and weight management.",
        "suggestedQuestions": [
            "I have headache, what should I eat?",
            "What foods help with better sleep?",
            "What should I eat to lose weight?",
        ],
    }
