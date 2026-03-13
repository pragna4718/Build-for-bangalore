const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/health", require("./routes/health"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/grocery", require("./routes/grocery"));
app.use("/api/exposome", require("./routes/exposome"));

// Health check
app.get("/api/ping", (req, res) => res.json({ status: "ok" }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

// Start server immediately, attempt MongoDB connection in background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Try to connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && typeof mongoUri === "string" && mongoUri.length > 0) {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.warn("MongoDB connection warning:", err.message);
      console.warn("Server running but database features may not work.");
      console.warn("Ensure MongoDB is running or update MONGODB_URI in .env");
    });
} else {
  console.warn("No MONGODB_URI set. Server running without database.");
  console.warn("Set MONGODB_URI in server/.env to enable database features.");
}
