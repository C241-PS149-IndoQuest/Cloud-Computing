const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const csv = require("csv-parser");
const { random, sortBy } = require("lodash");

// Load CSV file and return data as JSON
const loadResources = async () => {
  const results = [];
  const filePath = path.resolve(__dirname, "../bali_destinations.csv");
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        results.forEach((row) => {
          row["Rating"] = parseFloat(row["Rating"]);
        });
        resolve(results);
      })
      .on("error", (err) => reject(err));
  });
};

const cleanDataForJson = (data) => {
  return data.map((item) => {
    const cleanedItem = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === "string") {
        let cleanedValue = value
          .replace(/\\|\/|"/g, "")
          .replace(/&/g, "and")
          .trim();
        cleanedItem[key] = cleanedValue;
      } else {
        cleanedItem[key] = value;
      }
    }
    return cleanedItem;
  });
};

// Handler function
const getCollaborativeRecommendations = async (userId) => {
  try {
    const df = await loadResources();

    // Simulate predictions
    df.forEach((row) => {
      row["Prediction"] = random(0, 1, true);
    });

    const recommendations = sortBy(df, "Prediction").reverse().slice(0, 10);
    return cleanDataForJson(recommendations);
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Export the handler function
module.exports = { getCollaborativeRecommendations };
