from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import predict, recommend, baseline, glycemic, sleep, dopamine, age, grocery, exposome, goals, emergency, doctor_match

load_dotenv()

app = FastAPI(
    title="PreventAI — AI Microservice",
    description="Health prediction and intelligence engine for PreventAI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(predict.router,   prefix="/predict",          tags=["Risk Prediction"])
app.include_router(recommend.router, prefix="/recommend",        tags=["Recommendations"])
app.include_router(baseline.router,  prefix="/baseline-compare", tags=["Baseline"])
app.include_router(glycemic.router,  prefix="/glycemic-curve",   tags=["Glycemic"])
app.include_router(sleep.router,     prefix="/sleep-debt",       tags=["Sleep"])
app.include_router(dopamine.router,  prefix="/dopamine-score",   tags=["Dopamine"])
app.include_router(age.router,       prefix="/age-biological",   tags=["Biological Age"])
app.include_router(grocery.router,   prefix="/grocery-analyze",  tags=["Grocery"])
app.include_router(exposome.router,  prefix="/exposome-risk",    tags=["Exposome"])
app.include_router(goals.router,     prefix="/goal-plan",        tags=["Goals"])
app.include_router(emergency.router, prefix="/emergency-detect", tags=["Emergency"])
app.include_router(doctor_match.router, prefix="/doctor-match", tags=["Doctor Match"])


@app.get("/ping")
def ping():
    return {"status": "ok", "service": "PreventAI AI Service"}
