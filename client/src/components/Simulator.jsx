import React, { useState, useEffect } from 'react';
import { Sliders, Leaf, ShieldAlert, Award, Save, RefreshCw, AlertCircle } from 'lucide-react';

export default function Simulator({ token, API_BASE, onActionSave }) {
  // Simulator Parameters
  const [elecPercent, setElecPercent] = useState(0); // 0 - 50%
  const [transitKm, setTransitKm] = useState(0);    // 0 - 200 km
  const [dietSwaps, setDietSwaps] = useState(0);    // 0 - 21 meals

  const [dryLaundry, setDryLaundry] = useState(false); // saves 2kg/week
  const [unplugVampire, setUnplugVampire] = useState(false); // saves 1.5kg/week
  const [ledBulbs, setLedBulbs] = useState(false); // saves 3kg/week

  const [targetReduction, setTargetReduction] = useState(15); // 5 - 50%
  const [plannedActions, setPlannedActions] = useState([]);

  // Calculated values
  const [currentFootprint, setCurrentFootprint] = useState(85.0); // Baseline default weekly (kg CO2)
  const [projectedSavings, setProjectedSavings] = useState(0);
  const [projectedFootprint, setProjectedFootprint] = useState(85.0);
  const [goalMet, setGoalMet] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch current stats and simulation targets
  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        // Get user dashboard data to establish an actual baseline weekly footprint
        const dashRes = await fetch(`${API_BASE}/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!dashRes.ok) throw new Error('Failed to load dashboard data');
        const dashData = await dashRes.json();
        
        // Use weekly total if they have logged activities, otherwise default to a national average (e.g., 85 kg)
        const weeklyEmissions = dashData.stats?.weekly?.total > 5 ? dashData.stats.weekly.total : 85.0;
        setCurrentFootprint(weeklyEmissions);

        // Get saved simulation settings
        const simRes = await fetch(`${API_BASE}/simulation`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!simRes.ok) throw new Error('Failed to load simulation settings');
        const simData = await simRes.json();
        
        setTargetReduction(simData.targetReductionPercentage || 15);
        setPlannedActions(simData.plannedActions || []);
        
        // Pre-populate sliders if actions exist
        const actions = simData.plannedActions || [];
        if (actions.some(a => a.includes('electricity') || a.includes('Power'))) setElecPercent(15);
        if (actions.some(a => a.includes('transit') || a.includes('commute'))) setTransitKm(40);
        if (actions.some(a => a.includes('vegetarian') || a.includes('diet') || a.includes('meat'))) setDietSwaps(5);
        
        if (actions.includes('Line dry laundry')) setDryLaundry(true);
        if (actions.includes('Unplug vampire electronics')) setUnplugVampire(true);
        if (actions.includes('Upgrade to LED bulbs')) setLedBulbs(true);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSimulationData();
  }, [token]);

  // Recalculate savings in real-time
  useEffect(() => {
    let savings = 0;
    const actionsList = [];

    // 1. Electricity calculation
    // Average weekly household electricity is ~40 kg.
    if (elecPercent > 0) {
      const elecSavings = 40 * (elecPercent / 100);
      savings += elecSavings;
      actionsList.push(`Reduce household electricity by ${elecPercent}%`);
    }

    // 2. Transit commute swap
    // Replacing petrol car (0.18 kg/km) with train (0.04 kg/km) saves 0.14 kg CO2 per km.
    if (transitKm > 0) {
      const transitSavings = transitKm * 0.14;
      savings += transitSavings;
      actionsList.push(`Swap ${transitKm} km of driving with public transport`);
    }

    // 3. Diet swaps (meat -> vegetarian)
    // Swapping average meat meal (2.0 kg) for vegetarian (0.8 kg) saves 1.2 kg per meal.
    if (dietSwaps > 0) {
      const dietSavings = dietSwaps * 1.2;
      savings += dietSavings;
      actionsList.push(`Eat plant-based vegetarian meals ${dietSwaps} times a week`);
    }

    // 4. Checkbox toggles
    if (dryLaundry) {
      savings += 2.0;
      actionsList.push('Line dry laundry');
    }
    if (unplugVampire) {
      savings += 1.5;
      actionsList.push('Unplug vampire electronics');
    }
    if (ledBulbs) {
      savings += 3.0;
      actionsList.push('Upgrade to LED bulbs');
    }

    // Include other adopted AI Advisor tips that were saved in database previously
    plannedActions.forEach(action => {
      if (!actionsList.includes(action) && 
          !action.startsWith('Reduce household electricity') &&
          !action.startsWith('Swap') &&
          !action.startsWith('Eat plant-based') &&
          action !== 'Line dry laundry' &&
          action !== 'Unplug vampire electronics' &&
          action !== 'Upgrade to LED bulbs') {
        actionsList.push(action);
        // Add nominal savings for imported tips
        savings += 5.0; 
      }
    });

    const finalSavings = parseFloat(savings.toFixed(1));
    const projected = Math.max(parseFloat((currentFootprint - finalSavings).toFixed(1)), 0);
    
    setProjectedSavings(finalSavings);
    setProjectedFootprint(projected);
    setPlannedActions(actionsList);

    // Check if target met
    const percentSaved = currentFootprint > 0 ? (finalSavings / currentFootprint) * 100 : 0;
    setGoalMet(percentSaved >= targetReduction);

  }, [elecPercent, transitKm, dietSwaps, dryLaundry, unplugVampire, ledBulbs, currentFootprint, targetReduction]);

  const handleSavePlan = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetReductionPercentage: targetReduction,
          plannedActions,
          estimatedSavings: projectedSavings
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save simulator plan.');

      setSuccessMsg('Your carbon reduction plan has been saved!');
      
      // Trigger achievements/confetti
      if (onActionSave && data.unlockedBadges) {
        onActionSave(data.unlockedBadges);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'hsl(var(--accent-emerald))', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Loading simulation engine...</p>
      </div>
    );
  }

  // Bar Chart calculations
  const maxBar = Math.max(currentFootprint, projectedFootprint, 10);
  const chartHeight = 160;
  const currentBarHeight = (currentFootprint / maxBar) * chartHeight;
  const projectedBarHeight = (projectedFootprint / maxBar) * chartHeight;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sliders size={28} style={{ color: 'hsl(var(--accent-emerald))' }} />
          Footprint Simulator
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Simulate carbon-reducing activities, project future scores, and save your action plan.
        </p>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--accent-emerald))', background: 'hsla(var(--accent-emerald), 0.1)', padding: '12px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', border: '1px solid hsla(var(--accent-emerald), 0.2)' }}>
          <Leaf size={18} />
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--accent-coral))', background: 'hsla(var(--accent-coral), 0.1)', padding: '12px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', border: '1px solid hsla(var(--accent-coral), 0.2)' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid-dashboard">
        
        {/* Left Columns: Simulator Controls */}
        <div className="glass-card col-8" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '12px' }}>
            Simulate Actions
          </h3>

          {/* Slider 1: Electricity */}
          <div className="slider-container">
            <div className="slider-label-row">
              <label className="form-label" htmlFor="elec-slider">Reduce Home Electricity</label>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'hsl(var(--accent-emerald))' }}>
                {elecPercent}% less usage
              </span>
            </div>
            <input 
              type="range" 
              id="elec-slider"
              min="0" 
              max="50" 
              className="slider-input" 
              value={elecPercent}
              onChange={e => setElecPercent(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Saves on cooling, heating, and appliances.</span>
          </div>

          {/* Slider 2: Transit Commute */}
          <div className="slider-container">
            <div className="slider-label-row">
              <label className="form-label" htmlFor="transit-slider">Commute swap (Driving &rarr; Train/Bus)</label>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'hsl(var(--accent-cyan))' }}>
                {transitKm} km swapped /wk
              </span>
            </div>
            <input 
              type="range" 
              id="transit-slider"
              min="0" 
              max="200" 
              className="slider-input" 
              value={transitKm}
              onChange={e => setTransitKm(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Replaces carbon-heavy car trips with train or bus travel.</span>
          </div>

          {/* Slider 3: Diet Swaps */}
          <div className="slider-container">
            <div className="slider-label-row">
              <label className="form-label" htmlFor="diet-slider">Meatless Swaps (Meat &rarr; Veg/Vegan)</label>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'hsl(var(--accent-coral))' }}>
                {dietSwaps} meals swapped /wk
              </span>
            </div>
            <input 
              type="range" 
              id="diet-slider"
              min="0" 
              max="21" 
              className="slider-input" 
              value={dietSwaps}
              onChange={e => setDietSwaps(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Swaps carbon-intensive meat dishes for healthy plant-based meals.</span>
          </div>

          {/* Checklist options */}
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px', color: 'hsl(var(--text-secondary))' }}>
              Household Efficiency Tweaks
            </h4>

            {[
              { id: 'dryLaundry', label: 'Air-dry laundry instead of electric dryer', val: dryLaundry, set: setDryLaundry, save: '2.0 kg CO2' },
              { id: 'unplugVampire', label: 'Unplug stand-by appliances (vampire power)', val: unplugVampire, set: setUnplugVampire, save: '1.5 kg CO2' },
              { id: 'ledBulbs', label: 'Upgrade remaining lights to energy-saving LEDs', val: ledBulbs, set: setLedBulbs, save: '3.0 kg CO2' }
            ].map(chk => (
              <div 
                key={chk.id}
                className={`simulator-checkbox-row ${chk.val ? 'checked' : ''}`}
                onClick={() => chk.set(!chk.val)}
              >
                <input 
                  type="checkbox" 
                  id={`chk-${chk.id}`}
                  className="checkbox-input" 
                  checked={chk.val}
                  onChange={() => {}} // handled by row click
                />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor={`chk-${chk.id}`} style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>{chk.label}</label>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-emerald))', fontWeight: '700' }}>-{chk.save}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Columns: Projections & SVG Charts */}
        <div className="glass-card col-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '12px' }}>
            Projections & Target
          </h3>

          {/* Goal Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="target-reduction">Weekly Target Reduction</label>
            <select 
              id="target-reduction"
              className="form-select"
              value={targetReduction}
              onChange={e => setTargetReduction(parseInt(e.target.value))}
            >
              <option value="5">5% Reduction</option>
              <option value="10">10% Reduction (Eco Starter)</option>
              <option value="15">15% Reduction (Green Path)</option>
              <option value="20">20% Reduction (Carbon Warrior)</option>
              <option value="30">30% Reduction (Zero Hero)</option>
              <option value="50">50% Reduction (Climate Leader)</option>
            </select>
          </div>

          {/* Real-time comparison SVG Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0' }}>
            <svg width="220" height={chartHeight + 30} style={{ overflow: 'visible' }}>
              {/* Baseline Bar */}
              <rect 
                x="30" 
                y={chartHeight - currentBarHeight} 
                width="50" 
                height={currentBarHeight} 
                fill="hsl(var(--accent-coral))" 
                rx="6"
              />
              <text x="55" y={chartHeight - currentBarHeight - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
                {currentFootprint}kg
              </text>
              <text x="55" y={chartHeight + 16} textAnchor="middle" fill="hsl(var(--text-muted))" fontSize="10" fontWeight="600">
                Current
              </text>

              {/* Projected Bar */}
              <rect 
                x="140" 
                y={chartHeight - projectedBarHeight} 
                width="50" 
                height={projectedBarHeight} 
                fill="hsl(var(--accent-emerald))" 
                rx="6"
              />
              <text x="165" y={chartHeight - projectedBarHeight - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
                {projectedFootprint}kg
              </text>
              <text x="165" y={chartHeight + 16} textAnchor="middle" fill="hsl(var(--text-muted))" fontSize="10" fontWeight="600">
                Projected
              </text>
            </svg>
          </div>

          {/* Goal evaluation box */}
          <div style={{
            background: goalMet ? 'hsla(var(--accent-emerald), 0.1)' : 'hsla(var(--accent-gold), 0.1)',
            border: `1px solid ${goalMet ? 'hsla(var(--accent-emerald), 0.3)' : 'hsla(var(--accent-gold), 0.3)'}`,
            borderRadius: 'var(--border-radius-sm)',
            padding: '14px',
            textAlign: 'center'
          }}>
            <h4 style={{ 
              color: goalMet ? 'hsl(var(--accent-emerald))' : 'hsl(var(--accent-gold))', 
              fontWeight: '700', 
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              {goalMet ? 'Target Met!' : 'Target Pending'}
            </h4>
            
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '6px' }}>
              You are simulating a savings of <strong style={{ color: 'white' }}>{projectedSavings} kg CO₂e</strong>. 
              This is a <strong style={{ color: 'white' }}>{currentFootprint > 0 ? Math.round((projectedSavings / currentFootprint) * 100) : 0}%</strong> reduction.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', gap: '8px', marginTop: '10px' }} 
            onClick={handleSavePlan}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Saving Plan...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Reduction Plan
              </>
            )}
          </button>
        </div>

        {/* Action list summary */}
        {plannedActions.length > 0 && (
          <div className="glass-card col-12">
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px' }}>Your Planned Carbon Saving Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plannedActions.map((action, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'hsl(var(--text-secondary))' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--accent-emerald))' }}></div>
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
