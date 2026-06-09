// Carbon emission calculation logic based on standard factors (expressed in kg CO2)

const TRANSPORT_FACTORS = {
  petrol_car: 0.18,      // per km
  diesel_car: 0.17,      // per km
  hybrid_car: 0.10,      // per km
  electric_car: 0.05,    // per km
  bus: 0.08,             // per passenger-km
  train: 0.04,           // per passenger-km
  flight: 0.15           // per passenger-km
};

const FOOD_FACTORS = {
  beef_heavy: 3.0,       // per portion/meal
  average_meat: 2.0,     // per portion/meal
  vegetarian: 0.8,       // per portion/meal
  vegan: 0.4             // per portion/meal
};

const PURCHASE_FACTORS = {
  electronics: 80.0,     // average per new laptop/phone/etc.
  clothing: 15.0,        // average per clothing item
  furniture: 50.0,       // average per furniture item
  general: 5.0           // average per general item
};

const ELECTRICITY_FACTOR = 0.5; // kg CO2 per kWh

/**
 * Calculate CO2 emissions for transportation
 * @param {string} fuelType - Type of transit (e.g. petrol_car, train, flight)
 * @param {number} distance - Distance in kilometers
 * @returns {number} Emissions in kg CO2
 */
function calculateTransport(fuelType, distance) {
  const factor = TRANSPORT_FACTORS[fuelType] || 0.15; // default to flight/avg
  return parseFloat((factor * distance).toFixed(2));
}

/**
 * Calculate CO2 emissions for electricity
 * @param {number} kwh - Consumption in kilowatt-hours
 * @returns {number} Emissions in kg CO2
 */
function calculateElectricity(kwh) {
  return parseFloat((kwh * ELECTRICITY_FACTOR).toFixed(2));
}

/**
 * Calculate CO2 emissions for food consumption
 * @param {string} mealType - Type of diet (e.g. beef_heavy, vegan)
 * @param {number} meals - Number of meals / portions
 * @returns {number} Emissions in kg CO2
 */
function calculateFood(mealType, meals) {
  const factor = FOOD_FACTORS[mealType] || 1.5; // default to average-ish
  return parseFloat((factor * meals).toFixed(2));
}

/**
 * Calculate CO2 emissions for purchases
 * @param {string} itemCategory - Item type (e.g. electronics, clothing)
 * @param {number} quantity - Quantity of items purchased
 * @returns {number} Emissions in kg CO2
 */
function calculatePurchase(itemCategory, quantity) {
  const factor = PURCHASE_FACTORS[itemCategory] || 10.0; // default
  return parseFloat((factor * quantity).toFixed(2));
}

/**
 * Master calculation dispatcher
 * @param {string} category - Log category ('transport', 'electricity', 'food', 'purchase')
 * @param {object} details - Details parameters
 * @returns {number} Total emissions in kg CO2
 */
function calculateEmissions(category, details) {
  switch (category) {
    case 'transport':
      return calculateTransport(details.fuelType, parseFloat(details.distance) || 0);
    case 'electricity':
      return calculateElectricity(parseFloat(details.kwh) || 0);
    case 'food':
      return calculateFood(details.mealType, parseFloat(details.meals) || 0);
    case 'purchase':
      return calculatePurchase(details.itemCategory, parseFloat(details.quantity) || 0);
    default:
      return 0;
  }
}

module.exports = {
  calculateTransport,
  calculateElectricity,
  calculateFood,
  calculatePurchase,
  calculateEmissions,
  TRANSPORT_FACTORS,
  FOOD_FACTORS,
  PURCHASE_FACTORS,
  ELECTRICITY_FACTOR
};
