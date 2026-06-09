import React, { useState, useEffect, useRef } from 'react';
import { Leaf, LogOut, Sun, Moon, Award, Calendar, Compass, PlusCircle, LayoutDashboard, Sliders } from 'lucide-react';
import confetti from 'canvas-confetti';

import Dashboard from './components/Dashboard';
import TrackerForm from './components/TrackerForm';
import AIAdvisor from './components/AIAdvisor';
import Simulator from './components/Simulator';
import Achievements from './components/Achievements';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Auth Form Inputs
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Confetti Badge Notification
  const [unlockedBadgeNotify, setUnlockedBadgeNotify] = useState(null);

  const googleBtnRef = useRef(null);

  // Sync theme to document body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Google Sign-In Script Hook
  useEffect(() => {
    if (token) return; // Only init Google Auth when logged out

    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    
    const initGoogleAuth = () => {
      if (window.google && clientID) {
        window.google.accounts.id.initialize({
          client_id: clientID,
          callback: handleGoogleCredentialResponse,
        });
        
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: theme === 'dark' ? 'filled_blue' : 'outline',
            size: 'large',
            width: '320',
          });
        }
      }
    };

    // Small delay to ensure script has executed
    const timer = setTimeout(() => {
      initGoogleAuth();
    }, 800);

    return () => clearTimeout(timer);
  }, [token, theme, authMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const saveAuth = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    setAuthError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveTab('dashboard');
  };

  // Process standard forms
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    const body = authMode === 'register' 
      ? { name: authName, email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      saveAuth(data.token, data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Google Sign-In Callback
  const handleGoogleCredentialResponse = async (response) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Login failed');
      
      saveAuth(data.token, data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Developer Bypass Login helper
  const handleDevBypass = async () => {
    const devEmail = 'dev.eco.explorer@carbonai.local';
    const devName = 'Eco Explorer';
    const devBypassToken = `dev_bypass_token_${Date.now()}_${devEmail}_${devName}`;
    
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: devBypassToken })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Developer Bypass failed');
      
      saveAuth(data.token, data.user);
    } catch (err) {
      setAuthError(err.message);
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
      // since particles fall down, animate a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Called when other components unlock a badge
  const processUnlockedBadges = (badges) => {
    if (badges && badges.length > 0) {
      // Find badge info
      const latest = badges[0]; // notify first one
      
      // Update user state badges
      const updatedUser = { ...user, badges: [...(user.badges || []), ...badges.map(b => b.id)] };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setUnlockedBadgeNotify(latest);
      triggerConfetti();
      
      // Clear after 6 seconds
      setTimeout(() => {
        setUnlockedBadgeNotify(null);
      }, 6000);
    }
  };

  const handleUpdateStreakAndBadges = (newStreak, unlockedBadges) => {
    if (newStreak !== user.streak || (unlockedBadges && unlockedBadges.length > 0)) {
      const updatedUser = { 
        ...user, 
        streak: newStreak, 
        badges: unlockedBadges && unlockedBadges.length > 0 
          ? [...new Set([...(user.badges || []), ...unlockedBadges.map(b => b.id)])]
          : user.badges
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      if (unlockedBadges && unlockedBadges.length > 0) {
        processUnlockedBadges(unlockedBadges);
      }
    }
  };

  if (!token) {
    return (
      <div className="app-container">
        <header className="glass-nav">
          <div className="nav-wrapper">
            <div className="logo-container">
              <Leaf size={22} style={{ color: 'hsl(var(--accent-emerald))' }} />
              <span>CarbonAItracker</span>
            </div>
            <button className="btn btn-secondary btn-icon-only" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="main-content auth-wrapper">
          <div className="glass-card auth-card animate-fade-in">
            <div className="auth-header">
              <div className="auth-logo">CarbonAItracker</div>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                {authMode === 'login' 
                  ? 'Sign in to monitor and reduce your daily carbon footprint.' 
                  : 'Join the community and start tracking your carbon emissions.'}
              </p>
            </div>

            {authError && (
              <div style={{ color: 'hsl(var(--accent-coral))', background: 'hsla(var(--accent-coral), 0.1)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.9rem', border: '1px solid hsla(var(--accent-coral), 0.2)' }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your name" 
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com" 
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">or authenticate with</div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="google-btn-wrapper"></div>
              ) : (
                <div style={{ textalign: 'center', width: '100%' }}>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '8px' }}>Google Auth client ID not configured.</p>
                </div>
              )}
              
              <button className="btn btn-secondary" style={{ width: '100%', gap: '8px' }} onClick={handleDevBypass}>
                <Leaf size={16} style={{ color: 'hsl(var(--accent-emerald))' }} />
                Bypass Auth (Dev Mode)
              </button>
            </div>

            <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span 
                style={{ color: 'hsl(var(--accent-emerald))', cursor: 'pointer', fontWeight: '600' }}
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              >
                {authMode === 'login' ? 'Sign Up' : 'Log In'}
              </span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification for Unlocked Badges */}
      {unlockedBadgeNotify && (
        <div className="animate-fade-in" style={{
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

      <header className="glass-nav">
        <div className="nav-wrapper">
          <div className="logo-container" onClick={() => setActiveTab('dashboard')}>
            <Leaf size={22} style={{ color: 'hsl(var(--accent-emerald))' }} />
            <span>CarbonAItracker</span>
          </div>
          
          <nav className="nav-links">
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
            <button className="btn btn-secondary btn-icon-only" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid hsl(var(--border-color))', paddingLeft: '12px' }}>
              <div style={{ textalign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user?.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>🔥 {user?.streak} Day Streak</span>
              </div>
              <button className="btn btn-danger btn-icon-only" onClick={handleLogout} title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main viewport */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard token={token} API_BASE={API_BASE} onNavigate={setActiveTab} />
        )}
        {activeTab === 'track' && (
          <TrackerForm 
            token={token} 
            API_BASE={API_BASE} 
            onSuccess={handleUpdateStreakAndBadges}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'advisor' && (
          <AIAdvisor token={token} API_BASE={API_BASE} onAddAction={processUnlockedBadges} />
        )}
        {activeTab === 'simulator' && (
          <Simulator token={token} API_BASE={API_BASE} onActionSave={processUnlockedBadges} />
        )}
        {activeTab === 'achievements' && (
          <Achievements token={token} API_BASE={API_BASE} />
        )}
      </main>
    </div>
  );
}
