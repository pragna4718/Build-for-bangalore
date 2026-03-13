const mongoose = require("mongoose");
const Doctor = require("./models/Doctor");
require("dotenv").config();

const mockDoctors = [
  {
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiologist",
    experience: "15 Years",
    fees: "$150",
    image: "https://i.pravatar.cc/150?img=1",
    availableTimes: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM"],
    bio: "Expert in treating complex heart conditions with over a decade of experience.",
  },
  {
    name: "Dr. Michael Chen",
    specialty: "Dermatologist",
    experience: "8 Years",
    fees: "$100",
    image: "https://i.pravatar.cc/150?img=11",
    availableTimes: ["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
    bio: "Specializing in cosmetic dermatology and skin cancer treatments.",
  },
  {
    name: "Dr. Emily Rodriguez",
    specialty: "General Physician",
    experience: "12 Years",
    fees: "$80",
    image: "https://i.pravatar.cc/150?img=5",
    availableTimes: ["08:00 AM", "09:30 AM", "11:00 AM", "05:00 PM"],
    bio: "Compassionate care for all your general health and wellness needs.",
  },
  {
    name: "Dr. James Wilson",
    specialty: "Neurologist",
    experience: "20 Years",
    fees: "$200",
    image: "https://i.pravatar.cc/150?img=8",
    availableTimes: ["09:00 AM", "11:00 AM", "03:00 PM", "06:00 PM"],
    bio: "Leading expert in neurological disorders and cognitive therapies.",
  },
  {
    name: "Dr. Olivia Martinez",
    specialty: "Pediatrician",
    experience: "10 Years",
    fees: "$120",
    image: "https://i.pravatar.cc/150?img=9",
    availableTimes: ["08:30 AM", "10:00 AM", "01:30 PM", "04:30 PM"],
    bio: "Dedicated to the health and well-being of infants, children, and adolescents.",
  }
];

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    // Clear existing docs
    await Doctor.deleteMany({});
    console.log("Cleared existing doctors");
    
    // Insert Mock Data
    await Doctor.insertMany(mockDoctors);
    console.log("Inserted mock doctors successfully");
    
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Database connection failed", err);
    process.exit(1);
  });
