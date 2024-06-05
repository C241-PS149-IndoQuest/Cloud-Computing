// controllers/userController.js
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const saltRounds = 10;

const registerUser = async (request, h) => {
  try {
    const { full_name, username, email, password } = request.payload;

    if (!full_name || !username || !email || !password) {
      return h.response("Missing required fields").code(400);
    }

    const userQuerySnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (!userQuerySnapshot.empty) {
      return h.response("Email already registered").code(400);
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUserRef = db.collection("users").doc();
    await newUserRef.set({
      full_name,
      username,
      email,
      password: hashedPassword,
    });

    return h.response("User created successfully").code(201);
  } catch (error) {
    console.error("Error creating user:", error);
    return h.response("Internal Server Error").code(500);
  }
};

const loginUser = async (request, h) => {
  try {
    const { email, password } = request.payload;

    if (!email || !password) {
      return h.response("Missing required fields").code(400);
    }

    const userQuerySnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (userQuerySnapshot.empty) {
      return h.response("Invalid email or password").code(400);
    }

    const userDoc = userQuerySnapshot.docs[0];
    const userData = userDoc.data();

    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return h.response("Invalid email or password").code(400);
    }

    const token = jwt.sign(
      { userId: userDoc.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return h.response({ token }).code(200);
  } catch (error) {
    console.error("Error logging in user:", error);
    return h.response("Internal Server Error").code(500);
  }
};

const logoutUser = (request, h) => {
  // Since we're not maintaining sessions, we'll just send a success message
  return h.response("User logged out successfully").code(200);
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};
