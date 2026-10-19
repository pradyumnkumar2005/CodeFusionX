const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.options("*", cors());
app.use(express.json());

// Test route
app.get("/api/hello", (req, res) => {
  res.json({
    success: true,
    message: "Server is running without DB 🚀",
  });
});

// POST example
app.post("http://localhost:8200/api/data", (req, res) => {
  const { name } = req.body;

  res.json({
    success: true,
    received: name,
  });
});

// Server start
const PORT = 8200;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});