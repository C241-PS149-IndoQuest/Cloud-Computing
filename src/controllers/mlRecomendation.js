const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const natural = require("natural");
const numeric = require("numeric");
const { sortBy } = require("lodash");

// Load resources
const loadResources = async () => {
  const results = [];
  const baseDir = path.resolve(__dirname, "..");
  const dfPath = path.join(baseDir, "./bali_destinations.csv");

  await new Promise((resolve, reject) => {
    fs.createReadStream(dfPath)
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

  return { df: results };
};

const calculateCosineSimilarity = (matrix) => {
  const magnitude = (vector) =>
    Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  const dotProduct = (vecA, vecB) =>
    vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);

  const similarityMatrix = matrix.map((vectorA) => {
    return matrix.map(
      (vectorB) =>
        dotProduct(vectorA, vectorB) / (magnitude(vectorA) * magnitude(vectorB))
    );
  });

  return similarityMatrix;
};

const getRecommendations = (destinationName, cosineSim, df) => {
  try {
    destinationName = destinationName.trim().toLowerCase();

    const destIndex = df.findIndex(
      (row) => row["Destination Name"].toLowerCase() === destinationName
    );

    if (destIndex !== -1) {
      const simScores = cosineSim[destIndex].map((score, idx) => ({
        idx,
        score,
      }));
      const sortedScores = simScores
        .sort((a, b) => b.score - a.score)
        .slice(1, 11);
      const destinationIndices = sortedScores.map((item) => item.idx);

      const recommendations = destinationIndices.map((idx) => df[idx]);
      return recommendations.sort((a, b) => b["Rating"] - a["Rating"]);
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error in getting recommendations:", error);
    return [];
  }
};

const getContentBasedRecommendations = async (destinationName) => {
  const { df } = await loadResources();

  const tfidf = new natural.TfIdf();
  df.forEach((row) => {
    tfidf.addDocument(row["Destination Name"]);
  });

  const matrix = df.map((row, i) => {
    const rowVector = new Array(tfidf.documents.length).fill(0);
    tfidf.tfidfs(row["Destination Name"], (i, measure) => {
      rowVector[i] = measure;
    });
    return rowVector;
  });

  const cosineSimilarity = calculateCosineSimilarity(matrix);

  return getRecommendations(destinationName, cosineSimilarity, df);
};

module.exports = { getContentBasedRecommendations };
