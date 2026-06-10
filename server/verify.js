const calculator = require('./carbonCalculator');
const { validateRecommendationsPayload } = require('./server');
const { sanitizePromptInput, getAIRecommendations } = require('./geminiService');

console.log("==================================================");
console.log("   CarbonAItracker Expanded Verification Suite    ");
console.log("==================================================");

let failedTests = 0;
let passedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
  }
}

// Helper to run middleware validation tests
function runValidationTest(payload) {
  let statusVal = null;
  let jsonVal = null;
  let nextCalled = false;

  const req = { body: payload };
  const res = {
    status: function(code) {
      statusVal = code;
      return this;
    },
    json: function(data) {
      jsonVal = data;
      return this;
    }
  };
  const next = () => {
    nextCalled = true;
  };

  validateRecommendationsPayload(req, res, next);
  return { statusVal, jsonVal, nextCalled };
}

async function startVerification() {
  // ----------------------------------------------------
  // 1. Carbon Calculator Formulas (20 assertions)
  // ----------------------------------------------------
  console.log("\n--- Testing Carbon Calculator Formulas ---");
  
  assert(calculator.calculateEmissions('transport', { fuelType: 'petrol_car', distance: 100 }) === 18.0, 
    "Petrol car: 100km should produce 18.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'electric_car', distance: 100 }) === 5.0, 
    "Electric car: 100km should produce 5.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'diesel_car', distance: 100 }) === 17.0, 
    "Diesel car: 100km should produce 17.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'hybrid_car', distance: 100 }) === 10.0, 
    "Hybrid car: 100km should produce 10.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'bus', distance: 50 }) === 4.0, 
    "Bus: 50km should produce 4.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'train', distance: 200 }) === 8.0, 
    "Train: 200km should produce 8.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'flight', distance: 1000 }) === 150.0, 
    "Flight: 1000km should produce 150.0kg CO2");
    
  assert(calculator.calculateEmissions('transport', { fuelType: 'invalid_type', distance: 100 }) === 15.0, 
    "Transport invalid type: should default to flight/average (0.15) coefficient");
    
  assert(calculator.calculateEmissions('electricity', { kwh: 150 }) === 75.0, 
    "Electricity: 150kWh should produce 75.0kg CO2");
    
  assert(calculator.calculateEmissions('food', { mealType: 'beef_heavy', meals: 3 }) === 9.0, 
    "Beef heavy: 3 meals should produce 9.0kg CO2");
    
  assert(calculator.calculateEmissions('food', { mealType: 'average_meat', meals: 5 }) === 10.0, 
    "Average meat: 5 meals should produce 10.0kg CO2");
    
  assert(calculator.calculateEmissions('food', { mealType: 'vegetarian', meals: 4 }) === 3.2, 
    "Vegetarian: 4 meals should produce 3.2kg CO2");
    
  assert(calculator.calculateEmissions('food', { mealType: 'vegan', meals: 10 }) === 4.0, 
    "Vegan: 10 meals should produce 4.0kg CO2");
    
  assert(calculator.calculateEmissions('food', { mealType: 'invalid_food', meals: 2 }) === 3.0, 
    "Food invalid type: should default to average (1.5) coefficient");
    
  assert(calculator.calculateEmissions('purchase', { itemCategory: 'clothing', quantity: 2 }) === 30.0, 
    "Clothing purchase: 2 items should produce 30.0kg CO2");
    
  assert(calculator.calculateEmissions('purchase', { itemCategory: 'electronics', quantity: 1 }) === 80.0, 
    "Electronics purchase: 1 item should produce 80.0kg CO2");
    
  assert(calculator.calculateEmissions('purchase', { itemCategory: 'furniture', quantity: 3 }) === 150.0, 
    "Furniture purchase: 3 items should produce 150.0kg CO2");
    
  assert(calculator.calculateEmissions('purchase', { itemCategory: 'general', quantity: 5 }) === 25.0, 
    "General purchase: 5 items should produce 25.0kg CO2");
    
  assert(calculator.calculateEmissions('purchase', { itemCategory: 'invalid_cat', quantity: 2 }) === 20.0, 
    "Purchase invalid category: should default to 10.0 coefficient");
    
  assert(calculator.calculateEmissions('transport', { distance: 'not-a-number' }) === 0, 
    "Calculator handles NaN values gracefully by returning 0");

  // ----------------------------------------------------
  // 2. AI Prompt Injection Protection Sanitizer (5 assertions)
  // ----------------------------------------------------
  console.log("\n--- Testing AI Prompt Injection Protection Sanitizer ---");
  
  const tagsSanitized = sanitizePromptInput("Hello <script>alert(1)</script> world");
  assert(!tagsSanitized.includes('<') && !tagsSanitized.includes('>'), 
    "Sanitizer strips HTML-style angle brackets (< and >)");
    
  const symbolsSanitized = sanitizePromptInput("My name is `John` and 'Jane' and [Bob] and {Alice}");
  assert(!symbolsSanitized.includes('`') && !symbolsSanitized.includes('"') && !symbolsSanitized.includes('[') && !symbolsSanitized.includes('{'), 
    "Sanitizer strips backticks, quotes, brackets, and braces");
    
  const truncatedVal = sanitizePromptInput("A very long name that exceeds the standard limit set by the parameters", 15);
  assert(truncatedVal.length === 15, 
    "Sanitizer truncates inputs exceeding length limits");
    
  assert(sanitizePromptInput(null) === '', 
    "Sanitizer handles null inputs gracefully by returning an empty string");
    
  assert(sanitizePromptInput(12345) === '', 
    "Sanitizer handles non-string inputs gracefully by returning an empty string");

  // ----------------------------------------------------
  // 3. Request Payload Schema Validation (18 assertions)
  // ----------------------------------------------------
  console.log("\n--- Testing Payload Schema Validator Middleware ---");

  // Valid Base Payload
  const baseValidPayload = {
    user: { name: 'Eco Explorer', streak: 5, badges: ['First Steps'] },
    logs: [
      { category: 'transport', co2Emissions: 10, date: '2026-06-10', details: { distance: 50, fuelType: 'petrol_car' } }
    ],
    simulation: { targetReductionPercentage: 20, estimatedSavings: 15, plannedActions: ['Eat less beef'] }
  };

  const validTest = runValidationTest(baseValidPayload);
  assert(validTest.nextCalled && validTest.statusVal === null, 
    "Valid payload successfully passes validation and invokes next()");

  // User object testing
  assert(runValidationTest({ user: "NotAnObject" }).statusVal === 400, 
    "Rejects payload where 'user' is not an object");
    
  assert(runValidationTest({ user: { name: 'NameWithSpecialChars<>' } }).statusVal === 400, 
    "Rejects non-alphanumeric user names to prevent tag injections");
    
  assert(runValidationTest({ user: { name: 'SuperLongNameThatExceedsTheThirtyCharactersAllowedLimit' } }).statusVal === 400, 
    "Rejects user names longer than 30 characters");
    
  assert(runValidationTest({ user: { streak: -5 } }).statusVal === 400, 
    "Rejects negative user streaks");
    
  assert(runValidationTest({ user: { streak: 1.5 } }).statusVal === 400, 
    "Rejects floating-point user streaks");
    
  assert(runValidationTest({ user: { badges: 'not-an-array' } }).statusVal === 400, 
    "Rejects user badges if they are not formatted as an array");

  // Logs array testing
  assert(runValidationTest({ logs: 'not-an-array' }).statusVal === 400, 
    "Rejects logs if they are not formatted as an array");
    
  const massiveLogs = Array(101).fill({ category: 'transport', co2Emissions: 1 });
  assert(runValidationTest({ logs: massiveLogs }).statusVal === 400, 
    "Rejects logs array exceeding the maximum limit of 100 entries");
    
  assert(runValidationTest({ logs: [{ category: 'invalid_cat', co2Emissions: 1 }] }).statusVal === 400, 
    "Rejects log entries with invalid tracking categories");
    
  assert(runValidationTest({ logs: [{ category: 'transport', co2Emissions: -5 }] }).statusVal === 400, 
    "Rejects log entries with negative emissions");
    
  assert(runValidationTest({ logs: [{ category: 'transport', co2Emissions: 2500 }] }).statusVal === 400, 
    "Rejects log entries with emissions exceeding safety cap (2000kg)");
    
  assert(runValidationTest({ logs: [{ category: 'transport', co2Emissions: 5, date: '10-06-2026' }] }).statusVal === 400, 
    "Rejects log entries with invalid date formats (not YYYY-MM-DD)");
    
  assert(runValidationTest({ logs: [{ category: 'transport', co2Emissions: 5, details: 'not-an-object' }] }).statusVal === 400, 
    "Rejects log entries with non-object details field");

  // Simulation object testing
  assert(runValidationTest({ simulation: "NotAnObject" }).statusVal === 400, 
    "Rejects simulation fields that are not objects");
    
  assert(runValidationTest({ simulation: { targetReductionPercentage: -5 } }).statusVal === 400, 
    "Rejects negative simulation target percentages");
    
  assert(runValidationTest({ simulation: { targetReductionPercentage: 105 } }).statusVal === 400, 
    "Rejects simulation target percentages exceeding 100%");
    
  assert(runValidationTest({ simulation: { estimatedSavings: -2.5 } }).statusVal === 400, 
    "Rejects negative simulation estimated savings");
    
  assert(runValidationTest({ simulation: { plannedActions: 'not-an-array' } }).statusVal === 400, 
    "Rejects simulation planned actions that are not formatted as an array");

  // ----------------------------------------------------
  // 4. Recommendations Advisor Fallback (5 assertions)
  // ----------------------------------------------------
  console.log("\n--- Testing Recommendations Advisor Fallback ---");
  
  const dummyLogs = [
    { category: 'transport', co2Emissions: 25.0, details: { fuelType: 'petrol_car', distance: 140 } },
    { category: 'electricity', co2Emissions: 40.0, details: { kwh: 80 } },
    { category: 'food', co2Emissions: 6.0, details: { mealType: 'beef_heavy', meals: 2 } }
  ];
  const dummySim = { targetReductionPercentage: 10, plannedActions: ['Switch to electric car'], estimatedSavings: 12 };
  
  const recs = await getAIRecommendations({ name: 'Tester', badges: [] }, dummyLogs, dummySim);
  
  assert(Array.isArray(recs), "Heuristics return an array of recommendations");
  assert(recs.length > 0, "Heuristics return at least one recommendation card");
  assert(recs.some(r => r.category === 'transport'), "Heuristics engine generates transport recommendations from logs");
  assert(recs.some(r => r.category === 'food' && r.title.toLowerCase().includes('beef')), "Heuristics engine identifies beef consumption in logs");
  assert(recs.every(r => typeof r.estimatedSavings === 'number' && r.estimatedSavings >= 0), "All recommendations have valid non-negative estimated savings");

  // ----------------------------------------------------
  // 5. App Security Architecture (4 assertions)
  // ----------------------------------------------------
  console.log("\n--- Testing App Security Architecture ---");
  
  const { app } = require('./server');
  const routes = app._router.stack.map(r => r.route ? r.route.path : undefined).filter(Boolean);
  
  assert(routes.includes('/api/recommendations'), "Server configures recommendations endpoint /api/recommendations");
  
  const helmetMiddleware = app._router.stack.some(m => m.name === 'helmet' || m.name === 'helmetMiddleware');
  assert(helmetMiddleware, "Helmet security headers middleware is mounted");
  
  const compressionMiddleware = app._router.stack.some(m => m.name === 'compression');
  assert(compressionMiddleware, "Compression middleware is mounted for asset lightweighting");
  
  const recsRoute = app._router.stack.find(s => s.route && s.route.path === '/api/recommendations');
  const hasRateLimiter = recsRoute && recsRoute.route.stack.length === 3 && recsRoute.route.stack[1].name === 'validateRecommendationsPayload';
  assert(hasRateLimiter, "Rate limit and payload validation middlewares are mounted on the recommendations route");

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(` Verification Completed: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("All stateless backend features verified successfully!");
    process.exit(0);
  }
}

startVerification();
