const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const SIMULATIONS_FILE = path.join(DATA_DIR, 'simulations.json');

// Ensure data directory and files exist
function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  [USERS_FILE, LOGS_FILE, SIMULATIONS_FILE].forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  });
}

// Atomic file writer to prevent data corruption
function writeJsonAtomic(filePath, data) {
  const tempPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    throw error;
  }
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// User Helpers
function getUsers() {
  return readJson(USERS_FILE);
}

function findUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const users = getUsers();
  return users.find(u => u.id === id);
}

function createUser(user) {
  const users = getUsers();
  const newUser = {
    id: user.id || Math.random().toString(36).substring(2, 11),
    email: user.email.toLowerCase(),
    name: user.name,
    passwordHash: user.passwordHash || null,
    googleId: user.googleId || null,
    createdAt: new Date().toISOString(),
    streak: 0,
    lastActiveDate: null,
    badges: [],
    ...user
  };
  users.push(newUser);
  writeJsonAtomic(USERS_FILE, users);
  return newUser;
}

function updateUser(id, updates) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  writeJsonAtomic(USERS_FILE, users);
  return users[index];
}

// Log Helpers
function getLogs() {
  return readJson(LOGS_FILE);
}

function findLogsByUserId(userId) {
  const logs = getLogs();
  return logs.filter(l => l.userId === userId);
}

function createLog(log) {
  const logs = getLogs();
  const newLog = {
    id: Math.random().toString(36).substring(2, 11),
    userId: log.userId,
    date: log.date || new Date().toISOString().split('T')[0],
    category: log.category, // 'transport' | 'electricity' | 'food' | 'purchase'
    co2Emissions: parseFloat(log.co2Emissions) || 0,
    details: log.details || {},
    createdAt: new Date().toISOString()
  };
  logs.push(newLog);
  writeJsonAtomic(LOGS_FILE, logs);
  return newLog;
}

function deleteLog(id, userId) {
  const logs = getLogs();
  const index = logs.findIndex(l => l.id === id && l.userId === userId);
  if (index === -1) return false;
  
  logs.splice(index, 1);
  writeJsonAtomic(LOGS_FILE, logs);
  return true;
}

// Simulation Helpers
function getSimulations() {
  return readJson(SIMULATIONS_FILE);
}

function getSimulation(userId) {
  const simulations = getSimulations();
  return simulations.find(s => s.userId === userId) || {
    userId,
    targetReductionPercentage: 0,
    plannedActions: [],
    estimatedSavings: 0
  };
}

function saveSimulation(userId, data) {
  const simulations = getSimulations();
  const index = simulations.findIndex(s => s.userId === userId);
  const updated = {
    userId,
    targetReductionPercentage: parseFloat(data.targetReductionPercentage) || 0,
    plannedActions: data.plannedActions || [],
    estimatedSavings: parseFloat(data.estimatedSavings) || 0,
    updatedAt: new Date().toISOString()
  };
  
  if (index === -1) {
    simulations.push(updated);
  } else {
    simulations[index] = updated;
  }
  
  writeJsonAtomic(SIMULATIONS_FILE, simulations);
  return updated;
}

// Initialize the database structure on load
initDB();

module.exports = {
  getUsers,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getLogs,
  findLogsByUserId,
  createLog,
  deleteLog,
  getSimulation,
  saveSimulation
};
