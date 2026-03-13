const router = require("express").Router();
const auth = require("../middleware/auth");
const ExposomeData = require("../models/ExposomeData");
const aiService = require("../services/aiService");
const axios = require("axios");

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const OPENWEATHER_BASE = "https://api.openweathermap.org";

// ── Helpers ─────────────────────────────────────────────────

function getAQICategory(aqi) {
  const categories = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
  };
  return categories[aqi] || "Unknown";
}

function getSunlightIntensity(uvIndex) {
  if (uvIndex <= 2) return "low";
  if (uvIndex <= 5) return "moderate";
  if (uvIndex <= 7) return "high";
  if (uvIndex <= 10) return "very high";
  return "extreme";
}

function generateHealthAlerts(weather, pollutants, aqi, uvIndex) {
  const alerts = [];

  // UV / Sunlight alerts
  if (uvIndex >= 6) {
    alerts.push({
      type: "uv",
      severity: uvIndex >= 8 ? "severe" : "high",
      title: "Intense Sunlight Warning",
      message: `UV index is ${uvIndex} — prolonged exposure may cause sunburn and increase skin cancer risk.`,
      recommendations: [
        "Apply SPF 50+ sunscreen every 2 hours",
        "Wear UV-protective sunglasses",
        "Carry an umbrella or wear a wide-brim hat",
        "Avoid direct sun between 10 AM – 4 PM",
        "Wear long-sleeved, light-colored clothing",
      ],
    });
  } else if (uvIndex >= 3) {
    alerts.push({
      type: "uv",
      severity: "moderate",
      title: "Moderate UV Exposure",
      message: `UV index is ${uvIndex} — some protection recommended.`,
      recommendations: [
        "Apply SPF 30+ sunscreen",
        "Wear sunglasses outdoors",
        "Seek shade during peak hours",
      ],
    });
  }

  // Temperature alerts
  if (weather.temp > 38) {
    alerts.push({
      type: "heat",
      severity: weather.temp > 42 ? "severe" : "high",
      title: "Extreme Heat Warning",
      message: `Temperature is ${weather.temp}°C — risk of heat stroke and dehydration.`,
      recommendations: [
        "Stay hydrated — drink water every 30 minutes",
        "Avoid outdoor exercise",
        "Stay in air-conditioned spaces",
        "Wear loose, breathable clothing",
        "Watch for signs of heat exhaustion",
      ],
    });
  } else if (weather.temp < 5) {
    alerts.push({
      type: "cold",
      severity: weather.temp < 0 ? "severe" : "high",
      title: "Cold Weather Alert",
      message: `Temperature is ${weather.temp}°C — risk of hypothermia.`,
      recommendations: [
        "Dress in warm layers",
        "Keep extremities covered",
        "Drink warm beverages",
        "Limit time outdoors",
      ],
    });
  }

  // AQI alerts
  if (aqi >= 4) {
    alerts.push({
      type: "aqi",
      severity: aqi >= 5 ? "severe" : "high",
      title: "Poor Air Quality",
      message: "Air quality is unhealthy — respiratory issues may worsen.",
      recommendations: [
        "Wear an N95/KN95 mask outdoors",
        "Avoid outdoor exercise completely",
        "Keep windows closed, use air purifiers",
        "Monitor symptoms if you have asthma or allergies",
      ],
    });
  } else if (aqi === 3) {
    alerts.push({
      type: "aqi",
      severity: "moderate",
      title: "Moderate Air Quality",
      message: "Air quality is acceptable but may concern sensitive individuals.",
      recommendations: [
        "Sensitive groups should reduce outdoor activity",
        "Consider wearing a mask during exercise",
        "Keep indoor ventilation filtered",
      ],
    });
  }

  // PM2.5 specific
  if (pollutants.pm25 > 35) {
    alerts.push({
      type: "pm25",
      severity: pollutants.pm25 > 75 ? "severe" : "high",
      title: "High PM2.5 Levels",
      message: `PM2.5 is at ${pollutants.pm25} μg/m³ — fine particles can penetrate deep into lungs.`,
      recommendations: [
        "Stay indoors with windows closed",
        "Use HEPA air purifiers",
        "Wear N95 mask if going outside",
        "Avoid high-traffic areas",
      ],
    });
  }

  // NO₂ specific
  if (pollutants.no2 > 100) {
    alerts.push({
      type: "no2",
      severity: pollutants.no2 > 200 ? "severe" : "high",
      title: "Elevated Nitrogen Dioxide",
      message: `NO₂ is at ${pollutants.no2} μg/m³ — can irritate airways and worsen asthma.`,
      recommendations: [
        "Avoid busy roads and traffic areas",
        "Keep car windows up in traffic",
        "Use air recirculation in vehicles",
      ],
    });
  }

  // O₃ specific
  if (pollutants.o3 > 100) {
    alerts.push({
      type: "o3",
      severity: pollutants.o3 > 180 ? "severe" : "high",
      title: "High Ground-Level Ozone",
      message: `O₃ is at ${pollutants.o3} μg/m³ — can cause chest pain, coughing, and throat irritation.`,
      recommendations: [
        "Limit outdoor activity in the afternoon",
        "Exercise indoors or in early morning",
        "Keep windows closed during peak O₃ hours",
      ],
    });
  }

  // CO specific
  if (pollutants.co > 10000) {
    alerts.push({
      type: "co",
      severity: "high",
      title: "High Carbon Monoxide",
      message: `CO is at ${(pollutants.co / 1000).toFixed(1)} mg/m³ — can cause headaches and dizziness.`,
      recommendations: [
        "Ensure proper ventilation indoors",
        "Avoid areas with heavy vehicle emissions",
        "If feeling dizzy, move to fresh air immediately",
      ],
    });
  }

  return alerts;
}

function generateCalendarSuggestions(schedule, weather, aqi, currentHour) {
  const suggestions = [];

  // Find free windows in the schedule
  const freeWindows = findFreeWindows(schedule);
  const isWeatherNice = weather.temp >= 15 && weather.temp <= 32 && aqi <= 2;
  const isMorning = currentHour >= 6 && currentHour <= 10;
  const isEvening = currentHour >= 16 && currentHour <= 20;

  for (const window of freeWindows) {
    const duration = window.durationMins;

    if (duration >= 10 && duration <= 30 && isWeatherNice) {
      // Post-meal walk suggestion
      if (window.afterEvent && /breakfast|lunch|dinner|meal|eat/i.test(window.afterEvent)) {
        suggestions.push({
          timeSlot: `${window.start} – ${window.end}`,
          activity: "Take a post-meal walk",
          reason: `The weather is pleasant (${weather.temp}°C) and you just had ${window.afterEvent.toLowerCase()}. Walking aids digestion and stabilizes blood sugar.`,
          duration: `${Math.min(duration, 20)} mins`,
          icon: "🚶",
        });
      }
      // General walk suggestion
      else if (isMorning || isEvening) {
        suggestions.push({
          timeSlot: `${window.start} – ${window.end}`,
          activity: "Go for a refreshing walk",
          reason: `Great weather (${weather.temp}°C, AQI: Good) and a free window — perfect for light cardio.`,
          duration: `${Math.min(duration, 20)} mins`,
          icon: "🌿",
        });
      }
    }

    if (duration >= 15 && duration <= 30) {
      // Stretching / yoga
      suggestions.push({
        timeSlot: `${window.start} – ${window.end}`,
        activity: "Quick stretching or desk yoga",
        reason: "A short break to stretch reduces muscle tension, improves posture, and boosts energy.",
        duration: "10-15 mins",
        icon: "🧘",
      });
    }

    if (duration >= 5 && duration <= 15) {
      // Breathing exercise
      suggestions.push({
        timeSlot: `${window.start} – ${window.end}`,
        activity: "Deep breathing exercise",
        reason: "Box breathing (4-4-4-4) reduces cortisol, calms the nervous system, and sharpens focus.",
        duration: "5 mins",
        icon: "🌬️",
      });
    }

    if (duration >= 20 && isWeatherNice && aqi <= 2 && (isMorning || isEvening)) {
      suggestions.push({
        timeSlot: `${window.start} – ${window.end}`,
        activity: "Outdoor meditation or mindfulness",
        reason: `Fresh air (AQI: Good) and mild temperature (${weather.temp}°C) — ideal for outdoor mindfulness.`,
        duration: "15-20 mins",
        icon: "🍃",
      });
    }
  }

  // If no schedule provided, give general suggestions
  if (suggestions.length === 0) {
    if (isWeatherNice && (isMorning || isEvening)) {
      suggestions.push({
        timeSlot: isMorning ? "Morning" : "Evening",
        activity: "Go for a walk outside",
        reason: `Weather is pleasant (${weather.temp}°C) and air quality is good — great time for outdoor activity.`,
        duration: "15-20 mins",
        icon: "🚶",
      });
    }
    suggestions.push({
      timeSlot: "Anytime",
      activity: "Hydration reminder",
      reason: `Temperature: ${weather.temp}°C. Stay hydrated — aim for 8 glasses of water today.`,
      duration: "1 min",
      icon: "💧",
    });
  }

  return suggestions.slice(0, 5); // Limit to top 5
}

function findFreeWindows(schedule) {
  if (!schedule || schedule.length === 0) return [];

  const windows = [];
  const sorted = [...schedule].sort((a, b) => {
    const timeA = parseInt(a.start.replace(":", ""));
    const timeB = parseInt(b.start.replace(":", ""));
    return timeA - timeB;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const endCurrent = sorted[i].end;
    const startNext = sorted[i + 1].start;

    const endMins = parseInt(endCurrent.split(":")[0]) * 60 + parseInt(endCurrent.split(":")[1]);
    const startMins = parseInt(startNext.split(":")[0]) * 60 + parseInt(startNext.split(":")[1]);
    const gap = startMins - endMins;

    if (gap >= 5) {
      windows.push({
        start: endCurrent,
        end: startNext,
        durationMins: gap,
        afterEvent: sorted[i].title,
      });
    }
  }

  return windows;
}

// ── Mock / Fallback data ────────────────────────────────────

function getMockData(lat, lon) {
  return {
    weather: {
      temp: 28,
      feelsLike: 31,
      humidity: 65,
      description: "Partly cloudy",
      icon: "02d",
      windSpeed: 3.5,
      pressure: 1012,
      visibility: 8000,
      clouds: 40,
      sunrise: Math.floor(Date.now() / 1000) - 21600,
      sunset: Math.floor(Date.now() / 1000) + 21600,
    },
    aqi: 2,
    aqiCategory: "Fair",
    uvIndex: 6,
    sunlightIntensity: "high",
    pollutants: {
      pm25: 22.5,
      pm10: 38.4,
      co: 320.4,
      no2: 18.7,
      o3: 68.2,
      so2: 5.1,
      nh3: 2.3,
    },
    location: { lat, lon, city: "Bangalore", country: "IN" },
  };
}

// ── Routes ──────────────────────────────────────────────────

// GET /api/exposome/current — fetch current environmental data
router.get("/current", auth, async (req, res) => {
  try {
    const { lat = 12.97, lon = 77.59 } = req.query;

    let weatherData, pollutionData, uvData;

    if (OPENWEATHER_API_KEY) {
      try {
        // Fetch weather, air pollution, and UV data in parallel
        const [weatherRes, pollutionRes] = await Promise.all([
          axios.get(`${OPENWEATHER_BASE}/data/2.5/weather`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY, units: "metric" },
          }),
          axios.get(`${OPENWEATHER_BASE}/data/2.5/air_pollution`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY },
          }),
        ]);

        const w = weatherRes.data;
        const p = pollutionRes.data.list[0];

        weatherData = {
          temp: Math.round(w.main.temp),
          feelsLike: Math.round(w.main.feels_like),
          humidity: w.main.humidity,
          description: w.weather[0].description,
          icon: w.weather[0].icon,
          windSpeed: w.wind.speed,
          pressure: w.main.pressure,
          visibility: w.visibility,
          clouds: w.clouds.all,
          sunrise: w.sys.sunrise,
          sunset: w.sys.sunset,
        };

        pollutionData = {
          pm25: p.components.pm2_5,
          pm10: p.components.pm10,
          co: p.components.co,
          no2: p.components.no2,
          o3: p.components.o3,
          so2: p.components.so2,
          nh3: p.components.nh3,
        };

        const aqiValue = p.main.aqi;

        // Try to fetch UV index
        let uvIndex = 0;
        try {
          const uvRes = await axios.get(`${OPENWEATHER_BASE}/data/2.5/uvi`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY },
          });
          uvIndex = uvRes.data.value || 0;
        } catch {
          // UV endpoint may not be available on all tiers, estimate from weather
          const hour = new Date().getHours();
          uvIndex = hour >= 10 && hour <= 16 ? 6 : 3;
        }

        const sunlightIntensity = getSunlightIntensity(uvIndex);
        const alerts = generateHealthAlerts(weatherData, pollutionData, aqiValue, uvIndex);

        const responseData = {
          weather: weatherData,
          aqi: aqiValue,
          aqiCategory: getAQICategory(aqiValue),
          uvIndex,
          sunlightIntensity,
          pollutants: pollutionData,
          alerts,
          location: {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            city: w.name || "Unknown",
            country: w.sys.country || "Unknown",
          },
        };

        // Save to DB (non-blocking)
        ExposomeData.create({
          userId: req.user.id,
          ...responseData,
        }).catch((err) => console.warn("Failed to save exposome data:", err.message));

        return res.json(responseData);
      } catch (apiErr) {
        console.warn("OpenWeatherMap API error, falling back to mock data:", apiErr.message);
      }
    }

    // Fallback to mock data
    const mock = getMockData(parseFloat(lat), parseFloat(lon));
    const alerts = generateHealthAlerts(mock.weather, mock.pollutants, mock.aqi, mock.uvIndex);
    const responseData = { ...mock, alerts, _mock: true };

    return res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/exposome/suggestions — smart calendar-based suggestions
router.post("/suggestions", auth, async (req, res) => {
  try {
    const { schedule = [], lat = 12.97, lon = 77.59 } = req.body;

    // Get current weather for context
    let weather = { temp: 28, humidity: 65, description: "Partly cloudy" };
    let aqi = 2;

    if (OPENWEATHER_API_KEY) {
      try {
        const [weatherRes, pollutionRes] = await Promise.all([
          axios.get(`${OPENWEATHER_BASE}/data/2.5/weather`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY, units: "metric" },
          }),
          axios.get(`${OPENWEATHER_BASE}/data/2.5/air_pollution`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY },
          }),
        ]);
        weather = {
          temp: Math.round(weatherRes.data.main.temp),
          humidity: weatherRes.data.main.humidity,
          description: weatherRes.data.weather[0].description,
        };
        aqi = pollutionRes.data.list[0].main.aqi;
      } catch {
        // Use defaults
      }
    }

    const currentHour = new Date().getHours();
    const suggestions = generateCalendarSuggestions(schedule, weather, aqi, currentHour);

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/exposome/history
router.get("/history", auth, async (req, res) => {
  try {
    const data = await ExposomeData.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
