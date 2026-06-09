const calculator = require('./carbonCalculator');
const path = require('path');
const fs = require('fs');

console.log("==================================================");
console.log("   CarbonAItracker Backend Verification Script    ");
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

async function startVerification() {
  // 1. Carbon Calculator Tests
  console.log("\n--- Testing Carbon Calculator Formulas ---");
  try {
    const petrolCarEmissions = calculator.calculateEmissions('transport', { fuelType: 'petrol_car', distance: 100 });
    assert(petrolCarEmissions === 18.0, `Petrol car emissions for 100km should be 18.0kg CO2 (got ${petrolCarEmissions}kg)`);

    const electricCarEmissions = calculator.calculateEmissions('transport', { fuelType: 'electric_car', distance: 100 });
    assert(electricCarEmissions === 5.0, `Electric car emissions for 100km should be 5.0kg CO2 (got ${electricCarEmissions}kg)`);

    const electricityEmissions = calculator.calculateEmissions('electricity', { kwh: 150 });
    assert(electricityEmissions === 75.0, `Electricity emissions for 150kWh should be 75.0kg CO2 (got ${electricityEmissions}kg)`);

    const foodBeefEmissions = calculator.calculateEmissions('food', { mealType: 'beef_heavy', meals: 3 });
    assert(foodBeefEmissions === 9.0, `Beef heavy emissions for 3 meals should be 9.0kg CO2 (got ${foodBeefEmissions}kg)`);

    const purchaseClothingEmissions = calculator.calculateEmissions('purchase', { itemCategory: 'clothing', quantity: 2 });
    assert(purchaseClothingEmissions === 30.0, `Clothing emissions for 2 items should be 30.0kg CO2 (got ${purchaseClothingEmissions}kg)`);
  } catch (e) {
    failedTests++;
    console.error("Calculator tests crashed:", e);
  }

  // 2. Recommendations Fallback Logic Check
  console.log("\n--- Testing Recommendations Advisor Fallback ---");
  try {
    const { getAIRecommendations } = require('./geminiService');
    const dummyLogs = [
      { category: 'transport', co2Emissions: 25.0, details: { fuelType: 'petrol_car', distance: 140 } },
      { category: 'electricity', co2Emissions: 40.0, details: { kwh: 80 } },
      { category: 'food', co2Emissions: 6.0, details: { mealType: 'beef_heavy', meals: 2 } }
    ];
    const dummySim = { targetReductionPercentage: 10, plannedActions: ['Switch to electric car'], estimatedSavings: 12 };
    
    const recs = await getAIRecommendations({ name: 'Tester', badges: [] }, dummyLogs, dummySim);
    assert(Array.isArray(recs) && recs.length > 0, "AI Advisor should return array of recommendations");
    assert(recs.some(r => r.category === 'transport'), "Heuristics should suggest transport based on data");
    assert(recs.some(r => r.category === 'food' && r.title.toLowerCase().includes('beef')), "Heuristics should detect beef eating logs");
    
    console.log(`\nSample Recommendation generated:\n- ${recs[0].title}: ${recs[0].description} (Difficulty: ${recs[0].difficulty})`);
  } catch (e) {
    failedTests++;
    console.error("Recommendations test crashed:", e);
  }

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
