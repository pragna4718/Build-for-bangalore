const router = require("express").Router();
const Doctor = require("../models/Doctor");
const axios = require("axios");

// GET /api/doctors - Fetch all doctors
router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/doctors/match - Call Python AI to match doctors based on symptoms
router.post("/match", async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ message: "Symptoms are required for AI matching." });
    }

    // Call Python FastAPI service (assuming it runs on port 8000 as per README)
    // We send the list of all doctors and the user's symptoms
    const doctors = await Doctor.find({});
    
    let pythonResponse;
    try {
       pythonResponse = await axios.post("http://localhost:8000/doctor-match", {
          symptoms,
          available_doctors: doctors.map(d => ({
            id: d._id.toString(),
            specialty: d.specialty,
            bio: d.bio,
            name: d.name
          }))
       });
    } catch(aiError) {
       console.error("AI Service Error:", aiError.message);
       // Fallback if AI fails, return all
       return res.json({ recommended_doctors: doctors });
    }

    // Filter DB doctors by AI provided IDs
    const matchedDoctorIds = pythonResponse.data.recommended_doctor_ids || [];
    const recommendedDoctors = doctors.filter(doc => matchedDoctorIds.includes(doc._id.toString()));

    res.json({ recommended_doctors: recommendedDoctors.length > 0 ? recommendedDoctors : doctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
