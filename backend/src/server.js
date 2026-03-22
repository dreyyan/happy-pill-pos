require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { prisma } = require('./lib/prisma');
const app = express();

// [MIDDLEWARE] CORS and JSON parsing
app.use(express.json());
app.use(cors({
  origin: `${process.env.FRONTEND_URL}`,
  credentials: true,
}));

// [MIDDLEWARE] Request Logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  console.log(req.body)
  next();
});

// [ROUTES]
// app.use('/api/auth', require('./routes/auth/index'));

// [MIDDLEWARE] Error Handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

module.exports = { prisma };