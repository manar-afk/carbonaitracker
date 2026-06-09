import React from 'react';
import { Award, Zap, Flame, Trash2, Car, Utensils, ShoppingBag, Leaf, Plus } from 'lucide-react';

export default function Dashboard({ user, logs, simulation, onDeleteLog, onNavigate }) {
  
  // Calculate Statistics Locally (Stateless)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  const stats = {
    daily: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 },
    weekly: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 },
    monthly: { total: 0, transport: 0, electricity: 0, food: 0, purchase: 0 }
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

  // Calculate daily history for the past 7 days for line charts
  const dailyHistory = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const dayLogs = logs.filter(l => l.date === dateStr);
    const transport = dayLogs.filter(l => l.category === 'transport').reduce((a, b) => a + b.co2Emissions, 0);
    const electricity = dayLogs.filter(l => l.category === 'electricity').reduce((a, b) => a + b.co2Emissions, 0);
    const food = dayLogs.filter(l => l.category === 'food').reduce((a, b) => a + b.co2Emissions, 0);
    const purchase = dayLogs.filter(l => l.category === 'purchase').reduce((a, b) => a + b.co2Emissions, 0);
    const total = transport + electricity + food + purchase;

    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    dailyHistory.push({
      date: dateStr,
      label,
      total: parseFloat(total.toFixed(1))
    });
  }

  // Category Icon helper
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'transport': return <Car size={16} />;
      case 'electricity': return <Zap size={16} />;
      case 'food': return <Utensils size={16} />;
      case 'purchase': return <ShoppingBag size={16} />;
      default: return <Leaf size={16} />;
    }
  };

  // Build SVG Line Chart Coordinates
  const maxEmissions = Math.max(...dailyHistory.map(d => d.total), 5);
  const width = 600;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;

  const points = dailyHistory.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / 6;
    const y = height - paddingY - (d.total * (height - 2 * paddingY)) / maxEmissions;
    return { x, y, data: d };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const handleDeleteClick = (id) => {
    if (window.confirm('Delete this carbon activity log?')) {
      onDeleteLog(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome & Streak Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Hello, {user.name}!</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Track and optimize your carbon footprint today.</p>
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

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Today */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Today's Footprint</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 6px 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'hsl(var(--text-primary))' }}>{stats.daily.total}</span>
            <span style={{ color: 'hsl(var(--text-muted))', fontWeight: '600' }}>kg CO₂e</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '10px' }}>
            {stats.daily.total > 0 
              ? 'Awesome! Keep keeping your daily scores green.'
              : 'Log activities today to monitor emissions.'}
          </p>
        </div>

        {/* Weekly */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Weekly Footprint</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 6px 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'hsl(var(--accent-emerald))' }}>{stats.weekly.total}</span>
            <span style={{ color: 'hsl(var(--text-muted))', fontWeight: '600' }}>kg CO₂e</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '10px' }}>
            {simulation.targetReductionPercentage > 0 
              ? `Your active target is a ${simulation.targetReductionPercentage}% carbon reduction.`
              : 'Go to Simulator to set a target.'}
          </p>
        </div>

        {/* Achievements Cabinet */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, hsla(var(--accent-gold), 0.2), hsla(var(--accent-emerald), 0.2))', color: 'hsl(var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'hsl(var(--text-primary))' }}>
              {user.badges?.length || 0} Achievements
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginTop: '4px' }}>
              Unlock badges by maintaining streaks and logging green meals.
            </p>
            <span 
              style={{ color: 'hsl(var(--accent-emerald))', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'inline-block', marginTop: '8px' }}
              onClick={() => onNavigate('achievements')}
            >
              Cabinet &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid-dashboard">
        
        {/* Line Chart */}
        <div className="glass-card col-8">
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Carbon Scores (Past 7 Days)</h3>
          
          <div className="chart-container" style={{ height: '160px' }}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="sparkline-svg">
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent-cyan))" />
                  <stop offset="100%" stopColor="hsl(var(--accent-emerald))" />
                </linearGradient>
              </defs>
              
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />
              <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="hsla(var(--border-color), 0.3)" strokeDasharray="4" />

              {pathD && <path d={pathD} className="sparkline-path" />}

              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" className="sparkline-dot" />
                  <text x={p.x} y={p.y - 12} fontSize="9" textAnchor="middle" fill="white" fontWeight="700">
                    {p.data.total > 0 ? `${p.data.total}` : ''}
                  </text>
                  <text x={p.x} y={height - 2} fontSize="10" textAnchor="middle" fill="hsl(var(--text-muted))" fontWeight="500">
                    {p.data.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Category Breakdown</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { name: 'Transit', value: stats.weekly.transport, color: 'hsl(var(--accent-cyan))', key: 'transport' },
                { name: 'Electricity', value: stats.weekly.electricity, color: 'hsl(var(--accent-emerald))', key: 'electricity' },
                { name: 'Food', value: stats.weekly.food, color: 'hsl(var(--accent-coral))', key: 'food' },
                { name: 'Shopping', value: stats.weekly.purchase, color: 'hsl(var(--accent-gold))', key: 'purchase' }
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
                    <div style={{ width: '100%', height: '6px', background: 'hsla(var(--text-primary), 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: cat.color, borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent logs */}
        <div className="glass-card col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Carbon Activities</h3>
            <span 
              style={{ color: 'hsl(var(--accent-emerald))', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
              onClick={() => onNavigate('track')}
            >
              Log Activity &rarr;
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
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="activity-item animate-fade-in">
                  <div className="activity-icon-text">
                    <div className={`activity-category-icon ${log.category}`}>
                      {getCategoryIcon(log.category)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'capitalize' }}>
                        {log.category === 'transport' ? `Commute (${log.details?.fuelType?.replace('_', ' ')})` : ''}
                        {log.category === 'electricity' ? 'Electricity Consumption' : ''}
                        {log.category === 'food' ? `${log.details?.mealType?.replace('_', ' ')} meals` : ''}
                        {log.category === 'purchase' ? `${log.details?.itemCategory} Purchase` : ''}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
                        {log.category === 'transport' ? `${log.details?.distance} km traveled` : ''}
                        {log.category === 'electricity' ? `${log.details?.kwh} kWh consumed` : ''}
                        {log.category === 'food' ? `${log.details?.meals} portions logged` : ''}
                        {log.category === 'purchase' ? `${log.details?.quantity} x ${log.details?.itemCategory} bought` : ''}
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
                    
                    <button 
                      className="btn btn-danger btn-icon-only" 
                      style={{ width: '32px', height: '32px' }} 
                      onClick={() => handleDeleteClick(log.id)}
                      aria-label="Delete log entry"
                    >
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
