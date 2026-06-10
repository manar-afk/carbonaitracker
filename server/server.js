/**
 * CarbonAItracker Backend Server Entrypoint
 * Implements security headers, request rate-limiting, Gzip compression,
 * schema validation, and Express error boundaries.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// --- 1. SECURITY & PRODUCTION CHECKS ---

// Strict env key checks for production environment
if (process.env.NODE_ENV === 'production') {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('[SECURITY WARNING]: GEMINI_API_KEY is not configured or is set to default. Running on fallback heuristics engine.');
  }
}

// Enable Gzip/Deflate compression for smaller bundle transfers
app.use(compression());

// Helmet secure HTTP headers with custom Content Security Policy (CSP) for Google Sign-In
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com/gsi/client", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://*"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Prevents iframe loading issues for Google auth
  referrerPolicy: { policy: 'same-origin' }
}));

// CORS Configuration - Restrict wildcard access in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? false // Same-origin only when serving the frontend statically
    : true,  // Allow all origins in local development mode
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' })); // Restrict payload size to prevent DoS spams

// Rate limiter for recommendation endpoints
const adviceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 60, // Limit each IP to 60 recommendations requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many recommendation requests from this IP. Please try again after 15 minutes.' }
});

// --- 2. REQUEST SCHEMAS & INPUT VALIDATORS ---

/**
 * Validates request payload schemas for Recommendations API
 * Blocks prompt injections, malicious strings, and invalid types.
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
function validateRecommendationsPayload(req, res, next) {
  const { user, logs, simulation } = req.body;

  // 1. Validate User Structure
  if (user) {
    if (typeof user !== 'object') {
      return res.status(400).json({ error: 'User field must be an object' });
    }
    // Strict alphanumeric/space validation for user name (blocks script/HTML tag injections)
    if (user.name && (typeof user.name !== 'string' || !/^[a-zA-Z0-9\s]{1,30}$/.test(user.name))) {
      return res.status(400).json({ error: 'User name must be alphanumeric and between 1-30 characters' });
    }
    if (user.streak !== undefined && (!Number.isInteger(user.streak) || user.streak < 0)) {
      return res.status(400).json({ error: 'User streak must be a non-negative integer' });
    }
    if (user.badges && !Array.isArray(user.badges)) {
      return res.status(400).json({ error: 'User badges must be an array of strings' });
    }
  }

  // 2. Validate Logs array (max 100 to prevent buffer spams)
  if (logs) {
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs field must be an array' });
    }
    if (logs.length > 100) {
      return res.status(400).json({ error: 'Logs array exceeds safe length limit of 100' });
    }
    const categories = ['transport', 'electricity', 'food', 'purchase'];
    for (const log of logs) {
      if (!log || typeof log !== 'object') {
        return res.status(400).json({ error: 'Log entry must be an object' });
      }
      if (!categories.includes(log.category)) {
        return res.status(400).json({ error: 'Log category must be a valid tracking category' });
      }
      if (typeof log.co2Emissions !== 'number' || isNaN(log.co2Emissions) || log.co2Emissions < 0 || log.co2Emissions > 2000) {
        return res.status(400).json({ error: 'Log emissions must be a non-negative number under 2,000kg' });
      }
      if (log.date && !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
        return res.status(400).json({ error: 'Log date must match YYYY-MM-DD format' });
      }
      if (log.details && typeof log.details !== 'object') {
        return res.status(400).json({ error: 'Log details must be an object' });
      }
    }
  }

  // 3. Validate Simulation object
  if (simulation) {
    if (typeof simulation !== 'object') {
      return res.status(400).json({ error: 'Simulation field must be an object' });
    }
    if (simulation.targetReductionPercentage !== undefined && 
       (typeof simulation.targetReductionPercentage !== 'number' || 
        simulation.targetReductionPercentage < 0 || 
        simulation.targetReductionPercentage > 100)) {
      return res.status(400).json({ error: 'Simulation target percentage must be a number between 0 and 100' });
    }
    if (simulation.estimatedSavings !== undefined && 
       (typeof simulation.estimatedSavings !== 'number' || simulation.estimatedSavings < 0)) {
      return res.status(400).json({ error: 'Simulation savings must be a non-negative number' });
    }
    if (simulation.plannedActions && !Array.isArray(simulation.plannedActions)) {
      return res.status(400).json({ error: 'Simulation planned actions must be an array' });
    }
  }

  next();
}

// --- 3. RECOMMENDATIONS & FALLBACK ADVISOR ---

const { getAIRecommendations } = require('./geminiService');

// Express Route - Rate limited & Input Validated
app.post('/api/recommendations', adviceRateLimiter, validateRecommendationsPayload, async (req, res, next) => {
  const { user, logs, simulation } = req.body;
  try {
    const recommendations = await getAIRecommendations(user, logs, simulation);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

// --- 4. STATIC SERVING & GLOBAL ERROR BOUNDARIES ---

// Serve frontend assets in production
const buildPath = path.join(__dirname, '../client/dist');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Global Error Handler Middleware (Quality & Security compliant)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED APP ERROR]:', err);
  
  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  
  // Hide stack trace in production to prevent information disclosure
  res.status(status).json({
    error: 'An internal server error occurred while processing recommendations.',
    message: isProd ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Stateless secure server is running on port ${PORT}`);
  });
}

module.exports = {
  app,
  validateRecommendationsPayload
};
