const express = require("express");
const cors = require('cors');
const morgan = require('morgan'); 

const authRoutes = require("./routes/authRoutes");
const playerRoutes = require("./routes/playerRoutes");
const adminCardRoutes = require("./routes/adminCardRoutes");
const playRoutes = require("./routes/playRoutes");
const protocolMiddleware = require("./middleware/protocolMiddleware");

const app = express();

// ✅ MIDDLEWARE ORDER MATTERS
app.use(morgan('dev'));
app.use(cors());
app.set("trust proxy", true);
app.use(express.json());
app.use(protocolMiddleware);

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Card battle game API is running."
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/admin", adminCardRoutes);
app.use("/api/play", playRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

module.exports = app;