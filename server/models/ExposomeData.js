const mongoose = require("mongoose");

const exposomeDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, default: Date.now },
    aqi: { type: Number, default: 0 },
    aqiCategory: { type: String, default: "Good" },
    weather: {
      temp: Number,
      feelsLike: Number,
      humidity: Number,
      description: String,
      icon: String,
      windSpeed: Number,
      pressure: Number,
      visibility: Number,
      clouds: Number,
      sunrise: Number,
      sunset: Number,
    },
    uvIndex: { type: Number, default: 0 },
    sunlightIntensity: { type: String, default: "low" },
    pollutants: {
      pm25: { type: Number, default: 0 },
      pm10: { type: Number, default: 0 },
      co: { type: Number, default: 0 },
      no2: { type: Number, default: 0 },
      o3: { type: Number, default: 0 },
      so2: { type: Number, default: 0 },
      nh3: { type: Number, default: 0 },
    },
    pathogenRisk: { type: String, default: "low" },
    alerts: [
      {
        type: { type: String },
        severity: { type: String, enum: ["low", "moderate", "high", "severe"] },
        title: String,
        message: String,
        recommendations: [String],
      },
    ],
    calendarSuggestions: [
      {
        timeSlot: String,
        activity: String,
        reason: String,
        duration: String,
        icon: String,
      },
    ],
    suggestions: [{ type: String }],
    location: {
      lat: Number,
      lon: Number,
      city: String,
      country: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExposomeData", exposomeDataSchema);
