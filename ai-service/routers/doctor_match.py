from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class DoctorInput(BaseModel):
    id: str
    specialty: str
    name: str
    bio: str

class MatchRequest(BaseModel):
    symptoms: str
    available_doctors: List[DoctorInput]

@router.post("")
def match_doctor(req: MatchRequest):
    symptoms = req.symptoms.lower()
    docs = req.available_doctors
    
    # Very basic heuristic matching for the demo
    # In reality, this would use an LLM or vector DB
    scored_docs = []
    
    for doc in docs:
        score = 0
        spec = doc.specialty.lower()
        bio = doc.bio.lower() if doc.bio else ""
        
        if "heart" in symptoms or "chest" in symptoms or "pressure" in symptoms:
            if "cardio" in spec: score += 10
        if "skin" in symptoms or "rash" in symptoms or "acne" in symptoms:
            if "derma" in spec: score += 10
        if "headache" in symptoms or "migraine" in symptoms or "dizzy" in symptoms:
            if "neuro" in spec: score += 10
        if "child" in symptoms or "kid" in symptoms or "baby" in symptoms:
            if "pediatr" in spec: score += 10
        if "fever" in symptoms or "cold" in symptoms or "cough" in symptoms:
            if "general" in spec or "physician" in spec: score += 5
            
        scored_docs.append((score, doc.id))
        
    # Sort by score descending
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    
    # Return top 3 IDs
    top_ids = [doc_id for score, doc_id in scored_docs[:3]]
    
    # If no specific match, just return the first 3
    if not any(score > 0 for score, _ in scored_docs):
         top_ids = [d.id for d in docs[:3]]
         
    return {
        "recommended_doctor_ids": top_ids,
        "status": "success"
    }
