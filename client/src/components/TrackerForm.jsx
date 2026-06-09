import React, { useState, useEffect } from 'react';
import { Leaf, Info, AlertCircle, CheckCircle, Car, Zap, Utensils, ShoppingBag } from 'lucide-react';

const PREVIEW_FACTORS = {
  transport: {
    petrol_car: 0.18,
    diesel_car: 0.17,
    hybrid_car: 0.10,
    electric_car: 0.05,
    bus: 0.08,
    train: 0.04,
    flight: 0.15
  },
  food: {
    beef_heavy: 3.0,
    average_meat: 2.0,
    vegetarian: 0.8,
    vegan: 0.4
  },
  purchase: {
    electronics: 80.0,
    clothing: 15.0,
    furniture: 50.0,
    general: 5.0
  },
  electricity: 0.5
};

export default function TrackerForm({ onAddLog, onNavigate }) {
  const [category, setCategory] = useState('transport');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Category specific states
  const [transportType, setTransportType] = useState('petrol_car');
  const [distance, setDistance] = useState('');
  
  const [electricityKwh, setElectricityKwh] = useState('');
  
  const [foodType, setFoodType] = useState('average_meat');
  const [foodMeals, setFoodMeals] = useState('1');
  
  const [purchaseType, setPurchaseType] = useState('general');
  const [purchaseQty, setPurchaseQty] = useState('1');

  // Real-time Preview Carbon Score
  const [estimatedCo2, setEstimatedCo2] = useState(0);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Enforce validation and compute preview
  useEffect(() => {
    let co2 = 0;
    
    if (category === 'transport') {
      const dist = parseFloat(distance) || 0;
      if (dist > 0) {
        co2 = dist * (PREVIEW_FACTORS.transport[transportType] || 0.15);
      }
    } else if (category === 'electricity') {
      const kwh = parseFloat(electricityKwh) || 0;
      if (kwh > 0) {
        co2 = kwh * PREVIEW_FACTORS.electricity;
      }
    } else if (category === 'food') {
      const meals = parseFloat(foodMeals) || 0;
      if (meals > 0) {
        co2 = meals * (PREVIEW_FACTORS.food[foodType] || 1.5);
      }
    } else if (category === 'purchase') {
      const qty = parseFloat(purchaseQty) || 0;
      if (qty > 0) {
        co2 = qty * (PREVIEW_FACTORS.purchase[purchaseType] || 5.0);
      }
    }
    
    setEstimatedCo2(parseFloat(co2.toFixed(2)));
  }, [category, transportType, distance, electricityKwh, foodType, foodMeals, purchaseType, purchaseQty]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    // Safety Validation
    if (!date) {
      setErrorMsg('Please select a valid date.');
      return;
    }

    let details = {};
    if (category === 'transport') {
      const dist = parseFloat(distance);
      if (isNaN(dist) || dist <= 0) {
        setErrorMsg('Please enter a valid positive distance in kilometers.');
        return;
      }
      details = { fuelType: transportType, distance: dist };
    } else if (category === 'electricity') {
      const kwh = parseFloat(electricityKwh);
      if (isNaN(kwh) || kwh <= 0) {
        setErrorMsg('Please enter a valid positive kWh value.');
        return;
      }
      details = { kwh };
    } else if (category === 'food') {
      const meals = parseInt(foodMeals);
      if (isNaN(meals) || meals <= 0) {
        setErrorMsg('Please enter a valid number of meals.');
        return;
      }
      details = { mealType: foodType, meals };
    } else if (category === 'purchase') {
      const qty = parseInt(purchaseQty);
      if (isNaN(qty) || qty <= 0) {
        setErrorMsg('Please enter a valid quantity.');
        return;
      }
      details = { itemCategory: purchaseType, quantity: qty };
    }

    // Add entry locally
    onAddLog({
      category,
      date,
      co2Emissions: estimatedCo2,
      details
    });

    setSuccessMsg('Activity logged successfully!');
    
    // Reset inputs
    setDistance('');
    setElectricityKwh('');
    setFoodMeals('1');
    setPurchaseQty('1');

    // Automatically navigate back to dashboard after 1.5 seconds
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1500);
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Leaf size={24} style={{ color: 'hsl(var(--accent-emerald))' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Log Carbon Activity</h2>
      </div>
      <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '24px', fontSize: '0.9rem' }}>
        Record your choices today to calculate your carbon impact and unlock achievements.
      </p>

      {/* Tabs Menu */}
      <div className="tab-container" role="tablist" aria-label="Carbon categories">
        {[
          { id: 'transport', label: 'Transit', icon: <Car size={16} /> },
          { id: 'electricity', label: 'Power', icon: <Zap size={16} /> },
          { id: 'food', label: 'Food', icon: <Utensils size={16} /> },
          { id: 'purchase', label: 'Shopping', icon: <ShoppingBag size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={category === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`tab-btn ${category === tab.id ? 'active' : ''}`}
            onClick={() => { setCategory(tab.id); setErrorMsg(''); setSuccessMsg(''); }}
            type="button"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab.icon}
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--accent-emerald))', background: 'hsla(var(--accent-emerald), 0.1)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.9rem', border: '1px solid hsla(var(--accent-emerald), 0.2)' }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--accent-coral))', background: 'hsla(var(--accent-coral), 0.1)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.9rem', border: '1px solid hsla(var(--accent-coral), 0.2)' }}>
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        {/* Date Selector */}
        <div className="form-group">
          <label className="form-label" htmlFor="log-date">Activity Date</label>
          <input 
            type="date" 
            id="log-date"
            className="form-input" 
            max={new Date().toISOString().split('T')[0]} 
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Tab Panels */}
        {category === 'transport' && (
          <div id="panel-transport" role="tabpanel" aria-labelledby="tab-transport" className="animate-fade-in">
            <div className="form-group">
              <label className="form-label" htmlFor="transport-type">Mode of Transportation</label>
              <select 
                id="transport-type"
                className="form-select"
                value={transportType}
                onChange={e => setTransportType(e.target.value)}
              >
                <option value="petrol_car">Petrol Car</option>
                <option value="diesel_car">Diesel Car</option>
                <option value="hybrid_car">Hybrid Car</option>
                <option value="electric_car">Electric Car (EV)</option>
                <option value="bus">Public Bus</option>
                <option value="train">Subway / Train</option>
                <option value="flight">Flight (Short/Long haul)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="distance">Distance Traveled (km)</label>
              <input 
                type="number" 
                id="distance"
                step="any"
                min="0.1"
                placeholder="e.g. 15.5" 
                className="form-input"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {category === 'electricity' && (
          <div id="panel-electricity" role="tabpanel" aria-labelledby="tab-electricity" className="animate-fade-in">
            <div className="form-group">
              <label className="form-label" htmlFor="electricity-kwh">Power Consumption (kWh)</label>
              <input 
                type="number" 
                id="electricity-kwh"
                step="any"
                min="0.1"
                placeholder="e.g. 12" 
                className="form-input"
                value={electricityKwh}
                onChange={e => setElectricityKwh(e.target.value)}
                required
              />
              <p style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '6px', alignItems: 'center' }}>
                <Info size={12} />
                Tip: Check your household electricity meter or utility statement.
              </p>
            </div>
          </div>
        )}

        {category === 'food' && (
          <div id="panel-food" role="tabpanel" aria-labelledby="tab-food" className="animate-fade-in">
            <div className="form-group">
              <label className="form-label" htmlFor="food-type">Primary Meal Diet Type</label>
              <select 
                id="food-type"
                className="form-select"
                value={foodType}
                onChange={e => setFoodType(e.target.value)}
              >
                <option value="beef_heavy">Beef Heavy Diet (High Carbon)</option>
                <option value="average_meat">Average Meat Diet (Chicken/Pork)</option>
                <option value="vegetarian">Vegetarian (Eggs/Dairy, no meat)</option>
                <option value="vegan">Vegan (Entirely plant-based, lowest carbon)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="food-meals">Number of Meals / Portions</label>
              <input 
                type="number" 
                id="food-meals"
                min="1"
                max="10"
                className="form-input"
                value={foodMeals}
                onChange={e => setFoodMeals(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {category === 'purchase' && (
          <div id="panel-purchase" role="tabpanel" aria-labelledby="tab-purchase" className="animate-fade-in">
            <div className="form-group">
              <label className="form-label" htmlFor="purchase-type">Purchase Item Category</label>
              <select 
                id="purchase-type"
                className="form-select"
                value={purchaseType}
                onChange={e => setPurchaseType(e.target.value)}
              >
                <option value="general">General Goods (Paper, groceries, simple items)</option>
                <option value="clothing">Clothing (T-shirt, pants, shoes)</option>
                <option value="electronics">Electronics (Laptop, tablet, smartphone)</option>
                <option value="furniture">Furniture (Table, chair, bed frame)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="purchase-qty">Quantity Purchased</label>
              <input 
                type="number" 
                id="purchase-qty"
                min="1"
                max="50"
                className="form-input"
                value={purchaseQty}
                onChange={e => setPurchaseQty(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* Real-time preview */}
        <div className="co2-preview-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={18} style={{ color: 'hsl(var(--accent-emerald))' }} />
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Estimated Impact</h4>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Calculated instantly using standard emission factors</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(var(--accent-emerald))' }}>
              {estimatedCo2}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginLeft: '4px', fontWeight: '600' }}>kg CO₂e</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 1 }}
          >
            Submit Log Entry
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => onNavigate('dashboard')}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}
