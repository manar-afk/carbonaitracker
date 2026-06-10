/**
 * Gemini AI Integration Service
 * Interfaces with Google Gemini API and implements prompt injection sanitizers.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Heuristics recommendation generator (Fallback)
 * @param {Array} logs - User's carbon log history
 * @param {object} simulation - User's active simulator targets
 * @returns {Array} List of recommendations
 */
function generateMockRecommendations(logs, simulation) {
  const categories = { transport: 0, electricity: 0, food: 0, purchase: 0 };
  const targetLogs = logs || [];
  
  targetLogs.forEach(l => {
    if (categories[l.category] !== undefined) {
      categories[l.category] += l.co2Emissions;
    }
  });

  const recommendations = [];

  // 1. Transportation
  if (categories.transport > 5) {
    recommendations.push({
      id: "rec_trans_1",
      title: "Public Transit Challenge",
      description: "Replace at least 2 car commutes this week with train or bus travel to lower your transport footprint.",
      category: "transport",
      estimatedSavings: parseFloat((categories.transport * 0.4).toFixed(1)),
      difficulty: "easy"
    });
    recommendations.push({
      id: "rec_trans_2",
      title: "Active Commuting",
      description: "Walk or bike for short trips under 3 km instead of driving. It is healthy for both you and the planet.",
      category: "transport",
      estimatedSavings: parseFloat((categories.transport * 0.15).toFixed(1)),
      difficulty: "easy"
    });
  } else {
    recommendations.push({
      id: "rec_trans_3",
      title: "Carpooling Connection",
      description: "Coordinate with coworkers or neighbors to carpool for your daily commute, cutting emissions in half.",
      category: "transport",
      estimatedSavings: 15.0,
      difficulty: "medium"
    });
  }

  // 2. Electricity
  if (categories.electricity > 10) {
    recommendations.push({
      id: "rec_elec_1",
      title: "Unplug Vampire Electronics",
      description: "Unplug electronics (TV, computer chargers, microwave) when not in use. Standby power accounts for 5-10% of electricity use.",
      category: "electricity",
      estimatedSavings: parseFloat((categories.electricity * 0.08).toFixed(1)),
      difficulty: "easy"
    });
    recommendations.push({
      id: "rec_elec_2",
      title: "LED Upgrade",
      description: "Replace your remaining incandescent or CFL bulbs with energy-efficient LEDs, which use 75% less energy.",
      category: "electricity",
      estimatedSavings: parseFloat((categories.electricity * 0.12).toFixed(1)),
      difficulty: "medium"
    });
  } else {
    recommendations.push({
      id: "rec_elec_3",
      title: "Wash Cold & Hang Dry",
      description: "Wash your laundry in cold water instead of hot, and air dry your clothes on a rack to save dryer power.",
      category: "electricity",
      estimatedSavings: 8.5,
      difficulty: "easy"
    });
  }

  // 3. Food
  const foodLogs = targetLogs.filter(l => l.category === 'food');
  const beefCount = foodLogs.filter(l => l.details?.mealType === 'beef_heavy').length;
  
  if (beefCount > 0) {
    recommendations.push({
      id: "rec_food_1",
      title: "Beef Substitution",
      description: `You logged ${beefCount} beef meal(s) recently. Swapping beef for chicken, fish, or beans reduces carbon emissions by up to 80% per meal.`,
      category: "food",
      estimatedSavings: parseFloat((beefCount * 2.2).toFixed(1)),
      difficulty: "easy"
    });
  }
  
  recommendations.push({
    id: "rec_food_2",
    title: "Meatless Mondays",
    description: "Dedicate one day a week to entirely plant-based eating. Raising livestock produces significant greenhouse gases.",
    category: "food",
    estimatedSavings: 12.0,
    difficulty: "easy"
  });

  // 4. Purchases
  if (categories.purchase > 20) {
    recommendations.push({
      id: "rec_purch_1",
      title: "Buy Secondhand First",
      description: "For clothing or furniture, browse thrifts or online marketplaces first. Extending item lifetimes cuts manufacturing carbon.",
      category: "purchase",
      estimatedSavings: parseFloat((categories.purchase * 0.35).toFixed(1)),
      difficulty: "medium"
    });
  }
  recommendations.push({
    id: "rec_purch_2",
    title: "Declutter & Donate",
    description: "Support the circular economy by donating unused items instead of throwing them away. Landfill waste produces methane.",
    category: "purchase",
    estimatedSavings: 5.0,
    difficulty: "easy"
  });

  // 5. Simulator target
  if (simulation && simulation.targetReductionPercentage > 0) {
    recommendations.push({
      id: "rec_sim_1",
      title: `Achieve Your ${simulation.targetReductionPercentage}% Goal`,
      description: `To hit your reduction goal of ${simulation.targetReductionPercentage}%, focus on implementing actions like: ${simulation.plannedActions?.join(', ') || 'reducing energy use and commuting green'}.`,
      category: "electricity",
      estimatedSavings: simulation.estimatedSavings || 10,
      difficulty: "medium"
    });
  }

  return recommendations.slice(0, 5);
}

/**
 * Generate AI-powered carbon reduction recommendations
 * @param {object} user - User details
 * @param {Array} logs - User's carbon log history
 * @param {object} simulation - User's active simulator targets
 * @returns {Promise<Array>} List of recommendations
 */
async function getAIRecommendations(user, logs, simulation) {
  const targetLogs = logs || [];
  const targetSim = simulation || { targetReductionPercentage: 0, plannedActions: [], estimatedSavings: 0 };
  const targetUser = user || { name: 'Eco Explorer', streak: 0, badges: [] };

  // Heuristic engine fallback
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return generateMockRecommendations(targetLogs, targetSim);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Calculate category breakdowns
    const categoryTotals = { transport: 0, electricity: 0, food: 0, purchase: 0 };
    targetLogs.forEach(l => {
      if (categoryTotals[l.category] !== undefined) {
        categoryTotals[l.category] += l.co2Emissions;
      }
    });

    const totalEmissions = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    // AI Prompt Injection Defense - Sanitize user strings before appending to prompt
    const sanitizePromptInput = (str, limit = 100) => {
      if (typeof str !== 'string') return '';
      // Strip brackets, backticks, quotes, and HTML tag delimiters
      const clean = str.replace(/[<>`"'{}\[\]]/g, '').trim();
      return clean.substring(0, limit);
    };

    const cleanUserName = sanitizePromptInput(targetUser.name, 30);
    const cleanPlannedActions = (targetSim.plannedActions || [])
      .map(a => sanitizePromptInput(a, 80))
      .filter(Boolean)
      .join(', ');

    const prompt = `
You are an expert environmental consultant and AI carbon advisor for a premium app called CarbonAItracker.
Your task is to analyze the user's recent carbon emissions footprint data and provide a list of exactly 4-5 highly personalized, practical, and actionable carbon reduction recommendations.

User Context:
- Name: ${cleanUserName}
- Active Streak: ${targetUser.streak} days
- Earned Badges: ${targetUser.badges?.join(', ') || 'None yet'}
- Recent Carbon Emissions breakdown:
  * Transportation: ${categoryTotals.transport.toFixed(1)} kg CO2
  * Electricity: ${categoryTotals.electricity.toFixed(1)} kg CO2
  * Food: ${categoryTotals.food.toFixed(1)} kg CO2
  * Purchases: ${categoryTotals.purchase.toFixed(1)} kg CO2
  * Total Carbon Footprint: ${totalEmissions.toFixed(1)} kg CO2
- User's saved simulator target: Reduce by ${targetSim.targetReductionPercentage}% (current target savings: ${targetSim.estimatedSavings?.toFixed(1) || 0} kg CO2).
- User's simulator planned actions: ${cleanPlannedActions || 'No actions selected yet'}.

Please format your response as a JSON object containing a "recommendations" array. Each item in the array must have the following keys:
1. "id" (string): Unique identifier starting with "rec_ai_" followed by a short unique tag.
2. "title" (string): A short, punchy title (e.g. "Switch to Cold Wash").
3. "description" (string): 2-3 sentences explaining exactly how the user can implement this action and why it helps, customized to their data. Reference their specific emissions if relevant (e.g. "Since you logged a beef meal...").
4. "category" (string): One of: "transport", "electricity", "food", "purchase".
5. "estimatedSavings" (number): Projected weekly/monthly CO2 savings in kg, matching their scale.
6. "difficulty" (string): One of: "easy", "medium", "hard".

Return ONLY a valid JSON object. Do not include markdown code block syntax (like \`\`\`json). Just the raw JSON string.
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    if (parsed && Array.isArray(parsed.recommendations)) {
      return parsed.recommendations;
    }
    
    throw new Error("Invalid output format from Gemini");
  } catch (error) {
    console.error("Error generating recommendations via Gemini API:", error);
    return generateMockRecommendations(targetLogs, targetSim);
  }
}

module.exports = {
  getAIRecommendations,
  generateMockRecommendations,
  sanitizePromptInput: (str, limit = 100) => {
    if (typeof str !== 'string') return '';
    const clean = str.replace(/[<>`"'{}\[\]]/g, '').trim();
    return clean.substring(0, limit);
  }
};
