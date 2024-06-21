const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");

// IndoQuest DB configuration
const indoQuestConfig = {
  projectId: "capstone-512",
  keyFilename: "serviceAccountKey.json",
};

const db = new Firestore(indoQuestConfig);
const storage = new Storage(indoQuestConfig); // Initialize storage
const bucket = storage.bucket("des-img-user");
const bucket1 = storage.bucket("profile-users-img");

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
db.settings({ ignoreUndefinedProperties: true });

module.exports = { upload, bucket, bucket1, db };
