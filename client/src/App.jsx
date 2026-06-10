import { useState, useEffect } from 'react';
import { Leaf, Sun, Moon, Award, Compass, PlusCircle, LayoutDashboard, Sliders, Edit3, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

import Dashboard from './components/Dashboard';
import TrackerForm from './components/TrackerForm';
import AIAdvisor from './components/AIAdvisor';
import Simulator from './components/Simulator';
import Achievements from './components/Achievements';

const API_BASE = '/api'; // Statically served endpoint relative to host

export default function App() {
  // Application state (fully backed by LocalStorage)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : { name: 'Eco Explorer', streak: 0, lastActiveDate: null, badges: [] };
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [simulation, setSimulation] = useState(() => {
    const saved = localStorage.getItem('simulation');
    return saved ? JSON.parse(saved) : { targetReductionPercentage: 15, plannedActions: [], estimatedSavings: 0 };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  // Custom Profile Editing
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.name);

  // Confetti Badge Toast Notification
  const [unlockedBadgeNotify, setUnlockedBadgeNotify] = useState(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('simulation', JSON.stringify(simulation));
  }, [simulation]);

  // Sync theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleNameChangeSubmit = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUser(prev => ({ ...prev, name: tempName.trim() }));
      setEditingName(false);
    }
  };

  // Confetti trigger helper
  const triggerConfetti = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Badge unlock checker
  const checkAndAwardBadges = (updatedUser, updatedLogs, updatedSimulation) => {
    const earned = new Set(updatedUser.badges);
    const newBadges = [];

    // Badge list definitions
    const badgeMap = {
      first_step: { id: 'first_step', name: 'First Step', description: 'Log your first carbon tracking activity' },
      streak_starter: { id: 'streak_starter', name: 'Streak Starter', description: 'Maintain a 3-day tracking streak' },
      eco_warrior: { id: 'eco_warrior', name: 'Eco Warrior', description: 'Maintain a 7-day tracking streak' },
      low_carbon_cook: { id: 'low_carbon_cook', name: 'Low Carbon Cook', description: 'Log 3 vegan or vegetarian meals' },
      commute_hero: { id: 'commute_hero', name: 'Commute Hero', description: 'Log 5 public transport trips' },
      power_saver: { id: 'power_saver', name: 'Power Saver', description: 'Log electricity and plan a 15%+ carbon reduction' },
      carbon_master: { id: 'carbon_master', name: 'Carbon Master', description: 'Log 10 activities and plan a 20%+ carbon reduction' }
    };

    // 1. First Step
    if (!earned.has('first_step') && updatedLogs.length >= 1) {
      newBadges.push(badgeMap.first_step);
    }

    // 2. Streaks
    if (!earned.has('streak_starter') && updatedUser.streak >= 3) {
      newBadges.push(badgeMap.streak_starter);
    }
    if (!earned.has('eco_warrior') && updatedUser.streak >= 7) {
      newBadges.push(badgeMap.eco_warrior);
    }

    // 3. Low Carbon Cook
    if (!earned.has('low_carbon_cook')) {
      const veggieCount = updatedLogs.filter(l => 
        l.category === 'food' && 
        (l.details?.mealType === 'vegan' || l.details?.mealType === 'vegetarian')
      ).length;
      if (veggieCount >= 3) {
        newBadges.push(badgeMap.low_carbon_cook);
      }
    }

    // 4. Commute Hero
    if (!earned.has('commute_hero')) {
      const transitCount = updatedLogs.filter(l => 
        l.category === 'transport' && 
        (l.details?.fuelType === 'bus' || l.details?.fuelType === 'train')
      ).length;
      if (transitCount >= 5) {
        newBadges.push(badgeMap.commute_hero);
      }
    }

    // 5. Power Saver
    if (!earned.has('power_saver')) {
      const hasElec = updatedLogs.some(l => l.category === 'electricity');
      if (hasElec && updatedSimulation.targetReductionPercentage >= 15) {
        newBadges.push(badgeMap.power_saver);
      }
    }

    // 6. Carbon Master
    if (!earned.has('carbon_master')) {
      if (updatedLogs.length >= 10 && updatedSimulation.targetReductionPercentage >= 20) {
        newBadges.push(badgeMap.carbon_master);
      }
    }

    if (newBadges.length > 0) {
      const allBadges = [...updatedUser.badges, ...newBadges.map(b => b.id)];
      setUser(prev => ({ ...prev, badges: allBadges }));
      
      // Notify the latest badge earned
      setUnlockedBadgeNotify(newBadges[0]);
      triggerConfetti();
      
      setTimeout(() => {
        setUnlockedBadgeNotify(null);
      }, 6000);
    }
  };

  // Add Log Entry
  const handleAddLog = (newLog) => {
    const logItem = {
      id: Math.random().toString(36).substring(2, 11),
      ...newLog,
      createdAt: new Date().toISOString()
    };
    
    const nextLogs = [logItem, ...logs];
    setLogs(nextLogs);

    // Calculate Streak
    const todayStr = new Date().toISOString().split('T')[0];
    let newStreak = user.streak;
    let lastActive = user.lastActiveDate;

    if (!lastActive) {
      newStreak = 1;
      lastActive = todayStr;
    } else if (lastActive === todayStr) {
      // Already logged today, streak stays same
    } else {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // broke, reset to 1
      }
      lastActive = todayStr;
    }

    const nextUser = {
      ...user,
      streak: newStreak,
      lastActiveDate: lastActive
    };

    setUser(nextUser);
    
    // Check achievements
    checkAndAwardBadges(nextUser, nextLogs, simulation);
  };

  // Delete Log Entry
  const handleDeleteLog = (id) => {
    const nextLogs = logs.filter(l => l.id !== id);
    setLogs(nextLogs);
  };

  // Update Simulation settings
  const handleSaveSimulation = (simData) => {
    const nextSim = { ...simulation, ...simData };
    setSimulation(nextSim);
    
    // Re-check achievements (like Power Saver or Carbon Master)
    checkAndAwardBadges(user, logs, nextSim);
  };

  return (
    <div className="app-container">
      {/* Toast Notification for Unlocked Badges */}
      {unlockedBadgeNotify && (
        <div className="animate-fade-in" role="alert" aria-live="polite" style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, hsl(var(--bg-secondary)), hsl(var(--bg-card)))',
          border: '2px solid hsl(var(--accent-gold))',
          borderRadius: 'var(--border-radius-md)',
          padding: '16px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '360px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, hsla(var(--accent-gold), 0.2), hsla(var(--accent-emerald), 0.2))',
            color: 'hsl(var(--accent-gold))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Award size={24} />
          </div>
          <div>
            <h4 style={{ color: 'hsl(var(--accent-gold))', fontWeight: '700', fontSize: '0.95rem' }}>Achievement Unlocked!</h4>
            <p style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem', margin: '2px 0 0 0' }}>{unlockedBadgeNotify.name}</p>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', margin: '2px 0 0 0' }}>{unlockedBadgeNotify.description}</p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="glass-nav">
        <div className="nav-wrapper">
          <div className="logo-container" onClick={() => setActiveTab('dashboard')}>
            <Leaf size={22} style={{ color: 'hsl(var(--accent-emerald))' }} />
            <span>CarbonAItracker</span>
          </div>
          
          <nav className="nav-links" aria-label="Main Navigation">
            <span className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LayoutDashboard size={16} />
                Dashboard
              </div>
            </span>
            <span className={`nav-item ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={16} />
                Log Activity
              </div>
            </span>
            <span className={`nav-item ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={16} />
                AI Advisor
              </div>
            </span>
            <span className={`nav-item ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} />
                Reduction Simulator
              </div>
            </span>
            <span className={`nav-item ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} />
                Achievements
              </div>
            </span>
          </nav>

          <div className="nav-actions">
            <button className="btn btn-secondary btn-icon-only" onClick={toggleTheme} aria-label="Toggle dark/light theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid hsl(var(--border-color))', paddingLeft: '12px' }}>
              {editingName ? (
                <form onSubmit={handleNameChangeSubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', maxWidth: '100px' }}
                    required
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary btn-icon-only" style={{ width: '24px', height: '24px' }}>
                    <Check size={12} />
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {user.name}
                    <Edit3 size={12} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => { setTempName(user.name); setEditingName(true); }} />
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>🔥 {user.streak} Day Streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            user={user} 
            logs={logs} 
            simulation={simulation} 
            onDeleteLog={handleDeleteLog} 
            onNavigate={setActiveTab} 
          />
        )}
        {activeTab === 'track' && (
          <TrackerForm 
            onAddLog={handleAddLog} 
            onNavigate={setActiveTab} 
          />
        )}
        {activeTab === 'advisor' && (
          <AIAdvisor 
            user={user} 
            logs={logs} 
            simulation={simulation} 
            API_BASE={API_BASE} 
            onAdopt={handleSaveSimulation} 
          />
        )}
        {activeTab === 'simulator' && (
          <Simulator 
            key={simulation.updatedAt || 'simulator'}
            logs={logs} 
            simulation={simulation} 
            onSave={handleSaveSimulation} 
          />
        )}
        {activeTab === 'achievements' && (
          <Achievements user={user} />
        )}
      </main>
    </div>
  );
}
