from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

# Import all routers
from routers import predict, recommend, baseline, glycemic, sleep, dopamine, age, grocery, exposome, goals, emergency, food_plate, health_qa, doctor_match

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PreventAI — AI Microservice",
    description="Health prediction and intelligence engine for PreventAI",
    version="1.0.0",
)

# CORS – allow frontend origins (can be extended via env var)
origins = [
    "http://localhost:5000",
    "http://localhost:3000",
]
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(food_plate.router, prefix="/food-plate",      tags=["Food Plate"])
app.include_router(health_qa.router,  prefix="/health-qa",       tags=["Health QA"])
app.include_router(doctor_match.router, prefix="/doctor-match",  tags=["Doctor Match"])


@app.get("/")
def root():
    return {
        "service": "PreventAI AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/predict",
            "/recommend",
            "/baseline-compare",
            "/glycemic-curve",
            "/sleep-debt",
            "/dopamine-score",
            "/age-biological",
            "/grocery-analyze",
            "/exposome-risk",
            "/goal-plan",
            "/emergency-detect",
            "/food-plate",
            "/health-qa",
            "/doctor-match",
            "/ping"
        ]
    }


@app.get("/ping")
def ping():
    return {"status": "ok", "service": "PreventAI AI Service"}


@app.on_event("startup")
async def startup_event():
    logger.info("Starting PreventAI AI Microservice")
    # Check OpenRouter API key (without revealing it)
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        logger.info("OpenRouter API key is set")
    else:
        logger.warning("OPENROUTER_API_KEY not set – AI features may fail")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down PreventAI AI Microservice")