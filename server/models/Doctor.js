const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    experience: { type: String, required: true },
    fees: { type: String, required: true },
    image: { type: String, required: true },
    availableTimes: [{ type: String }],
    bio: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
