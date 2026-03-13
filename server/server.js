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

// Start server with port fallback so the process does not crash if the preferred port is busy.
const DEFAULT_PORT = Number(process.env.PORT || 5000);
const MAX_PORT_RETRIES = 10;

function startServerWithFallback(preferredPort, retries = 0) {
  const currentPort = preferredPort + retries;
  const server = app.listen(currentPort, () => {
    if (retries > 0) {
      console.warn(
        `Preferred port ${preferredPort} was busy. Server running on fallback port ${currentPort}`
      );
    } else {
      console.log(`Server running on port ${currentPort}`);
    }
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && retries < MAX_PORT_RETRIES) {
      console.warn(`Port ${currentPort} is in use. Trying port ${currentPort + 1}...`);
      startServerWithFallback(preferredPort, retries + 1);
      return;
    }

    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
}

startServerWithFallback(DEFAULT_PORT);

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
