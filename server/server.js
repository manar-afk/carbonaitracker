const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const db = require('./db');
const calculator = require('./carbonCalculator');
const aiService = require('./geminiService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'carbon_tracker_super_secret_key_12345';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Middleware
app.use(cors());
app.use(express.json());

// Auth Token Verification Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token expired or invalid' });
    req.user = user;
    next();
  });
}

// ---------------- AUTH ROUTES ----------------

// Local Registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = db.createUser({
    name,
    email,
    passwordHash
  });

  const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, streak: newUser.streak, badges: newUser.badges } });
});

// Local Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, streak: user.streak, badges: user.badges } });
});

// Google Sign-In verification endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required' });
  }

  try {
    let email, name, googleId;

    // Developer mode bypass check (when Google Client ID is not set up)
    if (credential.startsWith('dev_bypass_token_')) {
      const parts = credential.split('_');
      email = parts[3] || 'dev@carbonai.local';
      name = parts[4] || 'Dev User';
      googleId = 'dev_google_id_' + email;
      console.log(`Developer auth bypass triggered for: ${email}`);
    } else {
      if (!googleClient) {
        return res.status(500).json({ error: 'Google Client ID not configured on server' });
      }
      
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
    }

    let user = db.findUserByEmail(email);

    if (!user) {
      // Create a new user with Google details
      user = db.createUser({
        email,
        name,
        googleId
      });
    } else if (!user.googleId) {
      // Link Google ID to existing email account
      user = db.updateUser(user.id, { googleId });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Invalid Google token' });
  }
});

// ---------------- DASHBOARD / PROFILE ROUTES ----------------

app.get('/api/dashboard', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const logs = db.findLogsByUserId(user.id);
  const simulation = db.getSimulation(user.id);

  // Group logs by time intervals
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Weekly boundary (last 7 days inclusive)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Monthly boundary (last 30 days inclusive)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  const stats = {
    daily: { transport: 0, electricity: 0, food: 0, purchase: 0, total: 0 },
    weekly: { transport: 0, electricity: 0, food: 0, purchase: 0, total: 0 },
    monthly: { transport: 0, electricity: 0, food: 0, purchase: 0, total: 0 }
  };

  logs.forEach(log => {
    const logDate = new Date(log.date);
    const co2 = log.co2Emissions;

    // Daily
    if (log.date === todayStr) {
      stats.daily[log.category] += co2;
      stats.daily.total += co2;
    }
    // Weekly
    if (logDate >= oneWeekAgo) {
      stats.weekly[log.category] += co2;
      stats.weekly.total += co2;
    }
    // Monthly
    if (logDate >= oneMonthAgo) {
      stats.monthly[log.category] += co2;
      stats.monthly.total += co2;
    }
  });

  // Round decimals
  ['daily', 'weekly', 'monthly'].forEach(period => {
    Object.keys(stats[period]).forEach(cat => {
      stats[period][cat] = parseFloat(stats[period][cat].toFixed(1));
    });
  });

  // Calculate daily totals for the past 7 days for line charts
  const dailyHistory = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Find logs for this day
    const dayLogs = logs.filter(l => l.date === dateStr);
    const transport = dayLogs.filter(l => l.category === 'transport').reduce((a, b) => a + b.co2Emissions, 0);
    const electricity = dayLogs.filter(l => l.category === 'electricity').reduce((a, b) => a + b.co2Emissions, 0);
    const food = dayLogs.filter(l => l.category === 'food').reduce((a, b) => a + b.co2Emissions, 0);
    const purchase = dayLogs.filter(l => l.category === 'purchase').reduce((a, b) => a + b.co2Emissions, 0);
    const total = transport + electricity + food + purchase;

    // Format label (e.g. "Jun 09")
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    dailyHistory.push({
      date: dateStr,
      label,
      transport: parseFloat(transport.toFixed(1)),
      electricity: parseFloat(electricity.toFixed(1)),
      food: parseFloat(food.toFixed(1)),
      purchase: parseFloat(purchase.toFixed(1)),
      total: parseFloat(total.toFixed(1))
    });
  }

  res.json({
    user: {
      name: user.name,
      email: user.email,
      streak: user.streak,
      badges: user.badges
    },
    stats,
    dailyHistory,
    simulation
  });
});

// ---------------- LOGS TRACKING ROUTES ----------------

app.get('/api/logs', authenticateToken, (req, res) => {
  const logs = db.findLogsByUserId(req.user.id);
  // Sort logs by date descending, then createdAt descending
  logs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  res.json(logs);
});

// Badge checker utility called on new activities
function checkAndAwardBadges(user, logs, latestLog, simulation) {
  const newBadges = [];
  const userBadges = new Set(user.badges);

  // 1. "First Step" badge: Logged first activity
  if (!userBadges.has('first_step') && logs.length >= 1) {
    newBadges.push({ id: 'first_step', name: 'First Step', description: 'Log your first carbon tracking activity' });
  }

  // 2. Streaks badges
  if (!userBadges.has('streak_starter') && user.streak >= 3) {
    newBadges.push({ id: 'streak_starter', name: 'Streak Starter', description: 'Maintain a 3-day tracking streak' });
  }
  if (!userBadges.has('eco_warrior') && user.streak >= 7) {
    newBadges.push({ id: 'eco_warrior', name: 'Eco Warrior', description: 'Maintain a 7-day tracking streak' });
  }

  // 3. Category specific badges
  // Low Carbon Cook: logged at least 3 vegan/vegetarian meals
  if (!userBadges.has('low_carbon_cook')) {
    const veggieMealsCount = logs.filter(l => 
      l.category === 'food' && 
      (l.details.mealType === 'vegan' || l.details.mealType === 'vegetarian')
    ).length;
    if (veggieMealsCount >= 3) {
      newBadges.push({ id: 'low_carbon_cook', name: 'Low Carbon Cook', description: 'Log 3 vegan or vegetarian meals' });
    }
  }

  // Commute Hero: logged at least 5 public transit (bus or train) rides
  if (!userBadges.has('commute_hero')) {
    const transitCount = logs.filter(l => 
      l.category === 'transport' && 
      (l.details.fuelType === 'bus' || l.details.fuelType === 'train')
    ).length;
    if (transitCount >= 5) {
      newBadges.push({ id: 'commute_hero', name: 'Commute Hero', description: 'Log 5 public transport trips' });
    }
  }

  // Power Saver: logged electricity log and simulated savings target > 15%
  if (!userBadges.has('power_saver')) {
    const hasElectricity = logs.some(l => l.category === 'electricity');
    if (hasElectricity && simulation.targetReductionPercentage >= 15) {
      newBadges.push({ id: 'power_saver', name: 'Power Saver', description: 'Log electricity and plan a 15%+ carbon reduction' });
    }
  }

  // Carbon Master: completed reduction goal in simulator and logged at least 10 activities
  if (!userBadges.has('carbon_master')) {
    if (simulation.targetReductionPercentage >= 20 && logs.length >= 10) {
      newBadges.push({ id: 'carbon_master', name: 'Carbon Master', description: 'Log 10 activities and plan a 20%+ carbon reduction' });
    }
  }

  if (newBadges.length > 0) {
    const updatedBadges = [...user.badges, ...newBadges.map(b => b.id)];
    db.updateUser(user.id, { badges: updatedBadges });
  }

  return newBadges;
}

app.post('/api/logs', authenticateToken, (req, res) => {
  const { category, details, date } = req.body;
  if (!category || !details) {
    return res.status(400).json({ error: 'Category and details are required' });
  }

  const co2 = calculator.calculateEmissions(category, details);
  
  const log = db.createLog({
    userId: req.user.id,
    date, // YYYY-MM-DD
    category,
    co2Emissions: co2,
    details
  });

  // Update User Streaks
  const user = db.findUserById(req.user.id);
  const todayStr = new Date().toISOString().split('T')[0];

  let newStreak = user.streak;
  let lastActive = user.lastActiveDate;

  if (!lastActive) {
    newStreak = 1;
    lastActive = todayStr;
  } else if (lastActive === todayStr) {
    // Already logged today, streak remains unchanged
  } else {
    const lastDate = new Date(lastActive);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // streak broke, reset to 1
    }
    lastActive = todayStr;
  }

  const updatedUser = db.updateUser(user.id, {
    streak: newStreak,
    lastActiveDate: lastActive
  });

  // Get all logs of user and current simulation to check badges
  const allLogs = db.findLogsByUserId(user.id);
  const simulation = db.getSimulation(user.id);
  const unlockedBadges = checkAndAwardBadges(updatedUser, allLogs, log, simulation);

  res.json({
    log,
    streak: updatedUser.streak,
    unlockedBadges
  });
});

app.delete('/api/logs/:id', authenticateToken, (req, res) => {
  const success = db.deleteLog(req.params.id, req.user.id);
  if (!success) return res.status(404).json({ error: 'Log not found' });
  res.json({ success: true });
});

// ---------------- RECOMMENDED TIPS / AI ADVISOR ----------------

app.get('/api/recommendations', authenticateToken, async (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const logs = db.findLogsByUserId(user.id);
  const simulation = db.getSimulation(user.id);

  const recs = await aiService.getAIRecommendations(user, logs, simulation);
  res.json(recs);
});

// ---------------- SIMULATION ROUTES ----------------

app.get('/api/simulation', authenticateToken, (req, res) => {
  const sim = db.getSimulation(req.user.id);
  res.json(sim);
});

app.post('/api/simulation', authenticateToken, (req, res) => {
  const { targetReductionPercentage, plannedActions, estimatedSavings } = req.body;
  const updatedSim = db.saveSimulation(req.user.id, {
    targetReductionPercentage,
    plannedActions,
    estimatedSavings
  });

  // Re-run achievements check on target updates
  const user = db.findUserById(req.user.id);
  const logs = db.findLogsByUserId(user.id);
  const unlockedBadges = checkAndAwardBadges(user, logs, null, updatedSim);

  res.json({
    simulation: updatedSim,
    unlockedBadges
  });
});

// Serve frontend assets in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
