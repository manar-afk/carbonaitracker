import React, { useState, useEffect } from 'react';
import { Award, Zap, Flame, Trash2, ShieldAlert, Plus, RefreshCw, Car, FlameKindling, Utensils, ShoppingBag, Leaf } from 'lucide-react';

export default function Dashboard({ token, API_BASE, onNavigate }) {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Dashboard Stats
      const dashRes = await fetch(`${API_BASE}/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!dashRes.ok) throw new Error('Failed to load dashboard data');
      const dashData = await dashRes.json();
      setData(dashData);

      // Fetch Recent Logs
      const logsRes = await fetch(`${API_BASE}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!logsRes.ok) throw new Error('Failed to load activity logs');
      const logsData = await logsRes.json();
      setLogs(logsData.slice(0, 5)); // show latest 5
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity log?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/logs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete log');
      
      // Refresh
      setLogs(prev => prev.filter(l => l.id !== id));
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'hsl(var(--accent-emerald))', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Calculating carbon scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ border: '1px solid hsla(var(--accent-coral), 0.3)', background: 'hsla(var(--accent-coral), 0.05)', textAlign: 'center', padding: '40px 20px' }}>
        <ShieldAlert size={48} style={{ color: 'hsl(var(--accent-coral))', marginBottom: '16px' }} />
        <h3>Failed to load Dashboard</h3>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: '8px 0 20px 0' }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchData}>Try Again</button>
      </div>
    );
  }

  const stats = data?.stats || {
    daily: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 },
    weekly: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 },
    monthly: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 }
  };

  const user = data?.user || { name: 'User', streak: 0, badges: [] };
  const dailyHistory = data?.dailyHistory || [];

  // Helper to choose icon for categories
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'transport': return <Car size={16} />;
      case 'electricity': return <Zap size={16} />;
      case 'food': return <Utensils size={16} />;
      case 'purchase': return <ShoppingBag size={16} />;
      default: return <Leaf size={16} />;
    }
  };

  // Build SVG Line Chart coordinates from dailyHistory
  const maxEmissions = Math.max(...dailyHistory.map(d => d.total), 5); // default min 5 to avoid division by zero
  const width = 600;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;

  const points = dailyHistory.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / 6;
    // Invert Y axis for SVG rendering
    const y = height - paddingY - (d.total * (height - 2 * paddingY)) / maxEmissions;
    return { x, y, data: d };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Welcome Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Hello, {user.name}!</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Here is your environmental footprint summary.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="streak-widget">
            <Flame size={24} style={{ color: 'hsl(var(--accent-gold))' }} />
            <div>
              <div className="streak-number">{user.streak}</div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '600', textTransform: 'uppercase' }}>Day Streak</div>
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={() => onNavigate('track')}>
            <Plus size={18} />
            Log Activity
          </button>
        </div>
      </div>

      {/* Grid: 3 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Today Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Today's Footprint</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 6px 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'hsl(var(--text-primary))' }}>{stats.daily.total}</span>
              <span style={{ color: 'hsl(var(--text-muted))', fontWeight: '600' }}>kg CO₂e</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '10px' }}>
            {stats.daily.total > 0 
              ? 'Keep tracking to calculate your weekly carbon score.'
              : 'You have not logged any activities today.'}
          </p>
        </div>

        {/* Weekly Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Weekly Footprint</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 6px 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'hsl(var(--accent-emerald))' }}>{stats.weekly.total}</span>
            <span style={{ color: 'hsl(var(--text-muted))', fontWeight: '600' }}>kg CO₂e</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '10px' }}>
            {data?.simulation?.targetReductionPercentage > 0 
              ? `Working towards a ${data.simulation.targetReductionPercentage}% reduction goal!`
              : 'Go to Simulator to set a carbon reduction target.'}
          </p>
        </div>

        {/* Badges Summary Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, hsla(var(--accent-gold), 0.2), hsla(var(--accent-emerald), 0.2))', color: 'hsl(var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'hsl(var(--text-primary))' }}>
              {user.badges.length} Achievements
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginTop: '4px' }}>
              Unlock badges by logging consistently and reducing emissions.
            </p>
            <span 
              style={{ color: 'hsl(var(--accent-emerald))', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'inline-block', marginTop: '8px' }}
              onClick={() => onNavigate('achievements')}
            >
              View achievements &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Section */}
      <div className="grid-dashboard">
        
        {/* Left Side: SVG Carbon History Chart */}
        <div className="glass-card col-8">
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Carbon Emissions History (Last 7 Days)</h3>
          
          <div className="chart-container" style={{ height: '160px' }}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="sparkline-svg">
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent-cyan))" />
                  <stop offset="100%" stopColor="hsl(var(--accent-emerald))" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />
              <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />

              {/* Chart Line Path */}
              {pathD && <path d={pathD} className="sparkline-path" />}

              {/* Data points */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" className="sparkline-dot" />
                  {/* Tooltip trigger area */}
                  <text x={p.x} y={p.y - 12} fontSize="9" textAnchor="middle" fill="white" fontWeight="700">
                    {p.data.total > 0 ? `${p.data.total}` : ''}
                  </text>
                  {/* Label */}
                  <text x={p.x} y={height - 2} fontSize="10" textAnchor="middle" fill="hsl(var(--text-muted))" fontWeight="500">
                    {p.data.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Right Side: Category Breakdown */}
        <div className="glass-card col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Category Breakdown (Weekly)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { name: 'Transportation', value: stats.weekly.transport, color: 'hsl(var(--accent-cyan))', key: 'transport' },
                { name: 'Electricity Usage', value: stats.weekly.electricity, color: 'hsl(var(--accent-emerald))', key: 'electricity' },
                { name: 'Food Consumption', value: stats.weekly.food, color: 'hsl(var(--accent-coral))', key: 'food' },
                { name: 'Purchases & Goods', value: stats.weekly.purchase, color: 'hsl(var(--accent-gold))', key: 'purchase' }
              ].map(cat => {
                const percentage = stats.weekly.total > 0 ? (cat.value / stats.weekly.total) * 100 : 0;
                return (
                  <div key={cat.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--text-secondary))' }}>
                        <span style={{ color: cat.color }}>{getCategoryIcon(cat.key)}</span>
                        {cat.name}
                      </div>
                      <div>{cat.value} kg ({Math.round(percentage)}%)</div>
                    </div>
                    {/* CSS Custom Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'hsla(var(--text-primary), 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: cat.color, borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Logs */}
        <div className="glass-card col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Carbon Activities</h3>
            <span 
              style={{ color: 'hsl(var(--accent-emerald))', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
              onClick={() => onNavigate('track')}
            >
              Log more activity &rarr;
            </span>
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'hsl(var(--text-muted))' }}>
              <p>No carbon activities logged recently.</p>
              <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => onNavigate('track')}>
                Log Your First Activity
              </button>
            </div>
          ) : (
            <div className="activity-list">
              {logs.map(log => (
                <div key={log.id} className="activity-item animate-fade-in">
                  <div className="activity-icon-text">
                    <div className={`activity-category-icon ${log.category}`}>
                      {getCategoryIcon(log.category)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'capitalize' }}>
                        {log.category === 'transport' ? `Commute (${log.details.fuelType?.replace('_', ' ')})` : ''}
                        {log.category === 'electricity' ? 'Electricity Consumption' : ''}
                        {log.category === 'food' ? `${log.details.mealType?.replace('_', ' ')} meals` : ''}
                        {log.category === 'purchase' ? `${log.details.itemCategory} Purchase` : ''}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
                        {log.category === 'transport' ? `${log.details.distance} km traveled` : ''}
                        {log.category === 'electricity' ? `${log.details.kwh} kWh consumed` : ''}
                        {log.category === 'food' ? `${log.details.meals} portions logged` : ''}
                        {log.category === 'purchase' ? `${log.details.quantity} x ${log.details.itemCategory} bought` : ''}
                        {' • '}
                        {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="activity-emissions">
                    <div>
                      <span className={`emissions-value ${log.co2Emissions > 15 ? 'high' : 'low'}`}>
                        +{log.co2Emissions.toFixed(1)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginLeft: '4px', fontWeight: '600' }}>kg CO₂e</span>
                    </div>
                    
                    <button className="btn btn-danger btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => handleDeleteLog(log.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
