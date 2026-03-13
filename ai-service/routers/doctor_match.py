import logging
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class Doctor(BaseModel):
    id: str
    name: str
    specialty: str
    bio: Optional[str] = ""


class DoctorMatchRequest(BaseModel):
    symptoms: str
    available_doctors: Optional[List[Doctor]] = []


# Keyword map: symptom keywords → specialties
SYMPTOM_SPECIALTY_MAP = {
    "heart": ["Cardiologist", "Cardiology"],
    "chest": ["Cardiologist", "Cardiology"],
    "cardiac": ["Cardiologist", "Cardiology"],
    "breath": ["Pulmonologist", "Pulmonology"],
    "lung": ["Pulmonologist", "Pulmonology"],
    "asthma": ["Pulmonologist", "Pulmonology"],
    "sugar": ["Endocrinologist", "Endocrinology", "Diabetologist"],
    "diabetes": ["Endocrinologist", "Endocrinology", "Diabetologist"],
    "thyroid": ["Endocrinologist", "Endocrinology"],
    "bone": ["Orthopedist", "Orthopedics", "Orthopedic"],
    "joint": ["Orthopedist", "Orthopedics", "Rheumatologist"],
    "skin": ["Dermatologist", "Dermatology"],
    "rash": ["Dermatologist", "Dermatology"],
    "headache": ["Neurologist", "Neurology"],
    "migraine": ["Neurologist", "Neurology"],
    "nerve": ["Neurologist", "Neurology"],
    "stomach": ["Gastroenterologist", "Gastroenterology", "General Physician"],
    "digest": ["Gastroenterologist", "Gastroenterology"],
    "eye": ["Ophthalmologist", "Ophthalmology"],
    "vision": ["Ophthalmologist", "Ophthalmology"],
    "ear": ["ENT", "Otolaryngologist"],
    "throat": ["ENT", "Otolaryngologist"],
    "mental": ["Psychiatrist", "Psychiatry", "Psychologist"],
    "anxiety": ["Psychiatrist", "Psychiatry", "Psychologist"],
    "depression": ["Psychiatrist", "Psychiatry", "Psychologist"],
    "child": ["Pediatrician", "Pediatrics"],
    "fever": ["General Physician"],
    "cold": ["General Physician"],
    "flu": ["General Physician"],
}


@router.post("")
def doctor_match(body: DoctorMatchRequest):
    """Match doctors to reported symptoms using keyword analysis."""
    symptoms_lower = body.symptoms.lower()
    matched_specialties = set()

    for keyword, specialties in SYMPTOM_SPECIALTY_MAP.items():
        if keyword in symptoms_lower:
            matched_specialties.update(s.lower() for s in specialties)

    if not body.available_doctors:
        logger.info(f"Doctor match: no doctors provided, returning empty list")
        return {"recommended_doctor_ids": [], "matched_specialties": list(matched_specialties)}

    recommended_ids = []
    for doctor in body.available_doctors:
        specialty_lower = doctor.specialty.lower()
        if any(s in specialty_lower for s in matched_specialties):
            recommended_ids.append(doctor.id)

    # If no match found, return all doctor IDs as fallback
    if not recommended_ids:
        recommended_ids = [d.id for d in body.available_doctors]

    logger.info(f"Doctor match: symptoms='{body.symptoms}' → {len(recommended_ids)} doctors recommended")
    return {"recommended_doctor_ids": recommended_ids, "matched_specialties": list(matched_specialties)}
