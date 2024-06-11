require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

const JWT_SECRET = process.env.JWT_SECRET;

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const register = async (request, h) => {
  const { name, username, email, password } = request.payload;

  if (!name || !email || !password) {
    return h
      .response({ message: "Name, email, and password are required" })
      .code(400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return h.response({ message: "Invalid email format" }).code(400);
  }

  const passwordRegex = /.*[0-9].*/;
  if (!passwordRegex.test(password)) {
    return h
      .response({ message: "Password must contain at least one number" })
      .code(400);
  }

  try {
    const usersRef = db.collection("users");
    const emailCheck = await usersRef.where("email", "==", email).get();
    if (!emailCheck.empty) {
      return h.response({ message: "Email already exists" }).code(400);
    }

    const usernameCheck = await usersRef
      .where("username", "==", username)
      .get();
    if (!usernameCheck.empty) {
      return h.response({ message: "Username already exists" }).code(400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      username,
      email,
      password: hashedPassword,
    };

    await usersRef.doc(email).set(userData);

    return h
      .response({
        user: {
          name: userData.name,
          username: userData.username,
          email: userData.email,
        },
        message: "User registered successfully",
      })
      .code(201);
  } catch (error) {
    console.error("Error registering user: ", error);
    return h.response({ message: "Error registering user" }).code(500);
  }
};

const login = async (request, h) => {
  try {
    const { email, password } = request.payload;
    const userRef = db.collection("users").doc(email);
    const doc = await userRef.get();

    if (!doc.exists) {
      return h.response({ error: true, message: "User not found" }).code(404);
    }

    const user = doc.data();
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return h.response({ error: true, message: "Invalid password" }).code(400);
    }

    const token = jwt.sign(
      { email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const loginResult = {
      userId: doc.id,
      name: user.name,
      token: token,
    };

    return h
      .response({ error: false, message: "success", loginResult })
      .code(200);
  } catch (error) {
    console.error("Error during login: ", error);
    return h
      .response({ error: true, message: "An internal server error occurred" })
      .code(500);
  }
};

const fetchUser = async (request, h) => {
  const { username } = request.query;

  if (!username) {
    return h.response({ message: "Username is required" }).code(400);
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return h.response({ message: "User not found" }).code(404);
    }

    let userData = {};
    snapshot.forEach((doc) => {
      userData = { id: doc.id, ...doc.data() };
    });

    return h
      .response({
        message: "User fetched successfully",
        user: userData,
      })
      .code(200);
  } catch (error) {
    console.error("Error fetching user: ", error);
    return h.response({ message: "Error fetching user" }).code(500);
  }
};

module.exports = { register, login, fetchUser };
