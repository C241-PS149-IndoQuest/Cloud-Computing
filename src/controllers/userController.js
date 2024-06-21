require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // Import jwt di sini
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const { bucket } = require("../config/db");
const { imageURL } = require("numeric");

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
      profileImageUrl:
        "https://storage.cloud.google.com/profile-users-img/profile-image/default.png", // Default profile image URL
    };

    await usersRef.doc().set(userData);

    return h
      .response({
        user: {
          name: userData.name,
          username: userData.username,
          email: userData.email,
          profileImageUrl: userData.profileImageUrl, // Include profileImageUrl in response
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
  console.log("Login function hit with payload:", request.payload);
  try {
    const { email, password } = request.payload;
    console.log("Checking user for email:", email);
    const userRef = db.collection("users").where("email", "==", email);
    const doc = await userRef.get();

    if (doc.empty) {
      console.log("User not found for email:", email);
      return h.response({ error: true, message: "User not found" }).code(404);
    }

    const user = doc.docs[0].data();
    console.log("User found:", user);
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("Invalid password for user:", email);
      return h.response({ error: true, message: "Invalid password" }).code(400);
    }

    const token = jwt.sign(
      { userId: doc.docs[0].id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const loginResult = {
      userId: doc.docs[0].id,
      email: user.email,
      name: user.name,
      token: token,
    };

    console.log("Login successful for user:", email);
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

const updateUserProfilePicture = async (request, h) => {
  try {
    const userEmail = request.auth.credentials.email;
    const file = request.payload.profileImage; // Ensure this matches the key used in Postman

    console.log("File received:", request.auth.credentials); // Log the received file ok
    if (!userEmail) {
      return h.response({ message: "User email is required" }).code(400);
    }

    if (!file) {
      return h
        .response({ message: "Profile picture file is required" })
        .code(400);
    }

    const userRef = db.collection("users").where("email", "==", userEmail);
    const userDoc = await userRef.get();

    if (userDoc.empty) {
      return h.response({ message: "User not found" }).code(404);
    }

    const userData = userDoc.docs[0].data();
    const oldProfilePicture = userData.profileImageUrl;

    const blob = bucket.file(
      `profile-image/${Date.now()}_${file.hapi.filename}`
    );
    const blobStream = blob.createWriteStream({
      metadata: { contentType: file.hapi.headers["content-type"] },
    });

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => resolve(Buffer.concat(chunks)));
      file.on("error", (err) => reject(err));
    });

    blobStream.on("error", (err) => {
      console.error(err);
      return h
        .response({
          message: "Failed to upload profile picture",
          error: err.message,
        })
        .code(500);
    });

    return new Promise((resolve, reject) => {
      blobStream.on("finish", async () => {
        try {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          await db.collection("users").doc(userDoc.docs[0].id).update({
            profileImageUrl: publicUrl,
          });

          if (
            oldProfilePicture &&
            oldProfilePicture !==
              "https://storage.cloud.google.com/profile-users-img/profile-image/default.png"
          ) {
            const oldFileName = oldProfilePicture.split("/").pop();
            const oldFile = bucket.file(`profile-image/${oldFileName}`);
            await oldFile.delete();
          }

          resolve(
            h
              .response({
                message: "Profile picture updated successfully",
                profileImageUrl: publicUrl,
              })
              .code(200)
          );
        } catch (err) {
          console.error(err);
          reject(
            h
              .response({ message: "Server error", error: err.message })
              .code(500)
          );
        }
      });

      blobStream.end(buffer);
    });
  } catch (err) {
    console.error("Error in updateUserProfilePicture:", err);
    return h
      .response({ message: "Server error", error: err.message })
      .code(500);
  }
};

// const updateUserProfile = async (request, h) => {
//   const { userId, email } = request.auth.credentials; // Dapatkan userId dan email dari token
//   const { name, username, password } = request.payload;

//   console.log("User email from token:", email); // Debug log
//   console.log("User ID from token:", userId); // Debug log

//   if (!email || !userId) {
//     return h.response({ message: "User email and ID are required" }).code(400);
//   }

//   try {
//     const userRef = db.collection("users").doc(userId); // Gunakan userId sebagai ID dokumen
//     const userDoc = await userRef.get();

//     console.log("User document path:", userRef.path); // Debug log
//     console.log("User document exists:", userDoc.exists); // Debug log

//     if (!userDoc.exists) {
//       console.log("Document not found for userId:", userId); // Additional debug log
//       return h.response({ message: "User not found" }).code(404);
//     }

//     const updates = {};
//     if (name) updates.name = name;
//     if (username) updates.username = username;
//     if (password) updates.password = await bcrypt.hash(password, 10);

//     await userRef.update(updates);

//     const updatedUserDoc = await userRef.get();
//     const updatedUserData = updatedUserDoc.data();

//     console.log("Updated user data:", updatedUserData); // Debug log

//     return h
//       .response({
//         message: "User profile updated successfully",
//         user: updatedUserData,
//       })
//       .code(200);
//   } catch (error) {
//     console.error("Error updating user profile: ", error);
//     return h
//       .response({ message: "Server error", error: error.message })
//       .code(500);
//   }
// };

const updateUserProfile = async (request, h) => {
  const { userId, email } = request.auth.credentials; // Dapatkan userId dan email dari token
  const { name: authorName, username, password } = request.payload;

  console.log("User email from token:", email); // Debug log
  console.log("User ID from token:", userId); // Debug log

  if (!email || !userId) {
    return h.response({ message: "User email and ID are required" }).code(400);
  }

  try {
    const userRef = db.collection("users").doc(userId); // Gunakan userId sebagai ID dokumen
    const userDoc = await userRef.get();

    console.log("User document path:", userRef.path); // Debug log
    console.log("User document exists:", userDoc.exists); // Debug log

    if (!userDoc.exists) {
      console.log("Document not found for userId:", userId); // Additional debug log
      return h.response({ message: "User not found" }).code(404);
    }

    const updates = {};
    if (authorName) updates.name = authorName;
    if (username) updates.username = username;
    if (password) updates.password = await bcrypt.hash(password, 10);

    console.log("Updates to be made:", updates); // Debug log

    await userRef.update(updates);

    // Update user data in posts
    const postsRef = db.collection("posts");
    const snapshot = await postsRef.where("userId", "==", userId).get();

    console.log("Number of posts to update:", snapshot.size); // Debug log

    if (snapshot.empty) {
      console.log("No posts found for userId:", userId); // Additional debug log
    } else {
      const batch = db.batch();
      snapshot.forEach((doc) => {
        const postRef = postsRef.doc(doc.id);
        const postUpdates = {};
        if (authorName) postUpdates.authorName = authorName;
        if (username) postUpdates.authorUsername = username; // Make sure authorUsername exists in post document
        console.log("Updating post:", doc.id, "with:", postUpdates); // Debug log
        batch.update(postRef, postUpdates);
      });

      await batch.commit();
    }

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    console.log("Updated user data:", updatedUserData); // Debug log

    return h
      .response({
        message: "User profile updated successfully",
        user: updatedUserData,
      })
      .code(200);
  } catch (error) {
    console.error("Error updating user profile: ", error);
    return h
      .response({ message: "Server error", error: error.message })
      .code(500);
  }
};

const getUserProfile = async (request, h) => {
  const { userId, email } = request.auth.credentials; // Dapatkan userId dan email dari token

  console.log("Fetching profile for userId:", userId); // Debug log

  if (!email || !userId) {
    return h.response({ message: "User email and ID are required" }).code(400);
  }

  try {
    const userRef = db.collection("users").doc(userId); // Gunakan userId sebagai ID dokumen
    const userDoc = await userRef.get();

    console.log("User document path:", userRef.path); // Debug log
    console.log("User document exists:", userDoc.exists); // Debug log

    if (!userDoc.exists) {
      console.log("Document not found for userId:", userId); // Additional debug log
      return h.response({ message: "User not found" }).code(404);
    }

    const userData = userDoc.data();
    console.log("Fetched user data:", userData); // Debug log

    return h
      .response({
        message: "User profile fetched successfully",
        user: userData,
        profileImageUrl: userData.profileImageUrl,
      })
      .code(200);
  } catch (error) {
    console.error("Error fetching user profile: ", error);
    return h
      .response({ message: "Server error", error: error.message })
      .code(500);
  }
};

module.exports = {
  register,
  login,
  fetchUser,
  updateUserProfilePicture,
  getUserProfile,
  updateUserProfile,
};
