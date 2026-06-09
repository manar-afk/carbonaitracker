const db = require('./db');
const calculator = require('./carbonCalculator');
const aiService = require('./geminiService');

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

  // 2. Database Operation Tests
  console.log("\n--- Testing JSON-file Database Operations ---");
  try {
    const testEmail = 'verify_test_user@carbonai.local';
    
    // Clean up if previous tests left state
    const users = db.getUsers();
    const existingIndex = users.findIndex(u => u.email === testEmail);
    if (existingIndex !== -1) {
      users.splice(existingIndex, 1);
      // Write directly to avoid issues
      require('fs').writeFileSync(
        require('path').join(__dirname, 'data', 'users.json'),
        JSON.stringify(users, null, 2)
      );
    }

    // Create User
    const user = db.createUser({
      name: 'Verification Tester',
      email: testEmail,
      passwordHash: 'dummyhash'
    });
    assert(user.name === 'Verification Tester', "User creation should store and return name correctly");
    assert(user.streak === 0, "Initial user streak should be 0");

    // Find User
    const foundUser = db.findUserByEmail(testEmail);
    assert(foundUser !== undefined && foundUser.id === user.id, "User lookup by email should find correct user");

    // Update User
    const updatedUser = db.updateUser(user.id, { streak: 5 });
    assert(updatedUser.streak === 5, "User update should save values correctly in db file");
    assert(db.findUserById(user.id).streak === 5, "Database fetch should return updated streak");

    // Log Creation
    const log = db.createLog({
      userId: user.id,
      category: 'transport',
      co2Emissions: 18.0,
      details: { fuelType: 'petrol_car', distance: 100 }
    });
    assert(log.userId === user.id, "Log should be successfully linked to user id");
    assert(log.co2Emissions === 18.0, "Log should contain correct calculated emissions");

    // Fetch Log
    const userLogs = db.findLogsByUserId(user.id);
    assert(userLogs.length === 1 && userLogs[0].id === log.id, "Find logs by userId should retrieve log entry");

    // Save Simulation
    const sim = db.saveSimulation(user.id, {
      targetReductionPercentage: 15,
      plannedActions: ['Commute by train', 'Turn off standby lights'],
      estimatedSavings: 25.5
    });
    assert(sim.targetReductionPercentage === 15, "Simulator settings should be saved");
    assert(db.getSimulation(user.id).estimatedSavings === 25.5, "Simulator get helper should return saved settings");

    // Cleanup Log and User
    const deleteResult = db.deleteLog(log.id, user.id);
    assert(deleteResult === true, "Log deletion should succeed");
    assert(db.findLogsByUserId(user.id).length === 0, "User logs should be empty after deletion");

  } catch (e) {
    failedTests++;
    console.error("Database tests crashed:", e);
  }

  // 3. Fallback Heuristics Tests
  console.log("\n--- Testing Recommendations Fallback Engine ---");
  try {
    const dummyLogs = [
      { category: 'transport', co2Emissions: 25.0, details: { fuelType: 'petrol_car', distance: 140 } },
      { category: 'electricity', co2Emissions: 40.0, details: { kwh: 80 } },
      { category: 'food', co2Emissions: 6.0, details: { mealType: 'beef_heavy', meals: 2 } }
    ];
    const dummySim = { targetReductionPercentage: 10, plannedActions: ['Switch to electric car'], estimatedSavings: 12 };
    
    const recs = await aiService.getAIRecommendations({ name: 'Tester', badges: [] }, dummyLogs, dummySim);
    assert(Array.isArray(recs) && recs.length > 0, "AI Advisor should return array of recommendations");
    assert(recs.some(r => r.category === 'transport'), "Heuristics should recommend transport based on data");
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
    console.log("All backend features verified successfully!");
    process.exit(0);
  }
}

startVerification();
