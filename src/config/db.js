// config/db.js
const { Firestore } = require("@google-cloud/firestore");

// IndoQuest DB configuration
const indoQuestConfig = {
  projectId: "capstone-512",
  keyFilename: "serviceAccountKey.json",
};

const db = new Firestore(indoQuestConfig);

module.exports = db;
