const router = require("express").Router();
const auth = require("../middleware/auth");
const HealthMetrics = require("../models/HealthMetrics");
const Prediction = require("../models/Prediction");
const MedicalReport = require("../models/MedicalReport");
const aiService = require("../services/aiService");

// POST /api/health/metrics — log daily health metrics
router.post("/metrics", auth, async (req, res) => {
  try {
    const metrics = await HealthMetrics.create({
      userId: req.user.id,
      ...req.body,
    });
    res.status(201).json(metrics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/health/metrics — get user's health history
router.get("/metrics", auth, async (req, res) => {
  try {
    const metrics = await HealthMetrics.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/analyze — trigger AI risk prediction
router.post("/analyze", auth, async (req, res) => {
  try {
    const metrics = await HealthMetrics.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(30);

    const aiResponse = await aiService.predictRisk({
      userId: req.user.id,
      metrics,
    });

    const prediction = await Prediction.create({
      userId: req.user.id,
      ...aiResponse.data,
    });

    res.json(prediction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/health/predictions — get user's prediction history
router.get("/predictions", auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Medical Reports ---

// POST /api/health/reports
router.post("/reports", auth, async (req, res) => {
  try {
    const report = await MedicalReport.create({
      userId: req.user.id,
      ...req.body,
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/health/reports
router.get("/reports", auth, async (req, res) => {
  try {
    const reports = await MedicalReport.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- AI-powered endpoints proxied through Node ---

// POST /api/health/glycemic-curve
router.post("/glycemic-curve", auth, async (req, res) => {
  try {
    const response = await aiService.glycemicCurve(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/sleep-debt
router.post("/sleep-debt", auth, async (req, res) => {
  try {
    const response = await aiService.sleepDebt(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/dopamine-score
router.post("/dopamine-score", auth, async (req, res) => {
  try {
    const response = await aiService.dopamineScore(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/biological-age
router.post("/biological-age", auth, async (req, res) => {
  try {
    const response = await aiService.biologicalAge(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/recommend
router.post("/recommend", auth, async (req, res) => {
  try {
    const response = await aiService.recommend(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/baseline-compare
router.post("/baseline-compare", auth, async (req, res) => {
  try {
    const response = await aiService.baselineCompare(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/goal-plan
router.post("/goal-plan", auth, async (req, res) => {
  try {
    const response = await aiService.goalPlan(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/emergency-detect
router.post("/emergency-detect", auth, async (req, res) => {
  try {
    const response = await aiService.emergencyDetect(req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
