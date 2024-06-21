const admin = require("firebase-admin");
const db = admin.firestore();
const { bucket } = require("../config/db");

const categoryGroups = [
  "Historical Landmark",
  "Mountain",
  "Rice Field",
  "Temple",
  "Beach",
  "Wildlife",
  "Spiritual Journey",
  "Waterfall",
  "Family-Friendly",
  "Hot Springs",
  "Countryside",
  "Viewpoint",
  "Day Spa",
  "Seafood",
  "Italian",
  "Vegan",
  "Western",
  "Asian",
  "Cafe",
  "Indian",
  "Indonesian",
  "French",
  "Buffet",
  "Budget Hotel",
  "Standard Hotel",
  "Premium Hotel",
  "High End Hotel",
  "Luxury Hotel",
  "Super Luxury Hotel",
];

const isValidCategory = (category) => {
  return Object.values(categoryGroups).some((group) =>
    group.includes(category)
  );
};

// const createPost = async (request, h) => {
//   try {
//     console.log("Request payload:", request.payload);

//     const { tittle, longitude, latitude, description, category, address } =
//       request.payload;
//     const image = request.payload.image;

//     if (!tittle) {
//       return h.response({ message: "Title is required" }).code(400);
//     }

//     if (!address) {
//       return h.response({ message: "Address is required" }).code(400);
//     }

//     if (!image) {
//       return h.response({ message: "Image file is required" }).code(400);
//     }
//     console.log();
//     if (!request.auth?.credentials?.username) {
//       return h.response({ message: "Username is required" }).code(400);
//     }

//     if (!longitude || !latitude || !description || !category) {
//       return h.response({ message: "All fields are required" }).code(400);
//     }

//     const authorName = request.auth.credentials.username;

//     if (!categoryGroups.includes(category)) {
//       return h.response({ message: "Valid category is required" }).code(400);
//     }

//     // Check if the title already exists
//     const existingPostsSnapshot = await db
//       .collection("posts")
//       .where("title", "==", tittle)
//       .get();

//     if (!existingPostsSnapshot.empty) {
//       return h
//         .response({ message: "This Destination Already Listed" })
//         .code(400);
//     }

//     const blob = bucket.file(
//       `post-destination/${Date.now()}_${image.hapi.filename}`
//     );
//     const blobStream = blob.createWriteStream({
//       metadata: { contentType: image.hapi.headers["content-type"] },
//     });

//     console.log("Creating buffer from image stream...");

//     const buffer = await new Promise((resolve, reject) => {
//       const chunks = [];
//       image.on("data", (chunk) => chunks.push(chunk));
//       image.on("end", () => resolve(Buffer.concat(chunks)));
//       image.on("error", (err) => reject(err));
//     });

//     console.log("Buffer created successfully");

//     blobStream.on("error", (err) => {
//       console.error("Error in blobStream:", err);
//       return h
//         .response({ message: "Failed to upload image", error: err.message })
//         .code(500);
//     });

//     return new Promise((resolve, reject) => {
//       blobStream.on("finish", async () => {
//         try {
//           const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//           const postRef = db.collection("posts").doc();
//           const postId = postRef.id;

//           console.log("Setting document in Firestore...");

//           await postRef.set({
//             title: tittle,
//             longitude,
//             latitude,
//             description,
//             imageUrl: publicUrl,
//             authorName,
//             address,
//             category,
//             ratings: [],
//             comments: [],
//             createdAt: admin.firestore.FieldValue.serverTimestamp(),
//           });

//           console.log("Document set successfully in Firestore");

//           resolve(
//             h
//               .response({
//                 message: "Post created successfully",
//                 post: {
//                   postId,
//                   authorName,
//                   title: tittle,
//                   longitude,
//                   latitude,
//                   description,
//                   imageUrl: publicUrl,
//                   address,
//                   category,
//                 },
//               })
//               .code(201)
//           );
//         } catch (err) {
//           console.error("Error in Firestore operation:", err);
//           reject(
//             h
//               .response({ message: "Server error", error: err.message })
//               .code(500)
//           );
//         }
//       });

//       blobStream.end(buffer);
//     });
//   } catch (err) {
//     console.error("Error in createPost function:", err);
//     return h
//       .response({ message: "Server error", error: err.message })
//       .code(500);
//   }
// };

const createPost = async (request, h) => {
  try {
    console.log("Request payload:", request.payload);

    const { tittle, longitude, latitude, description, category, address } =
      request.payload;
    const image = request.payload.image;

    if (!tittle) {
      return h.response({ message: "Title is required" }).code(400);
    }

    if (!address) {
      return h.response({ message: "Address is required" }).code(400);
    }

    if (!image) {
      return h.response({ message: "Image file is required" }).code(400);
    }

    if (
      !request.auth?.credentials?.userId ||
      !request.auth?.credentials?.username
    ) {
      return h
        .response({ message: "User ID and Username are required" })
        .code(400);
    }

    if (!longitude || !latitude || !description || !category) {
      return h.response({ message: "All fields are required" }).code(400);
    }

    const { userId, username: authorName } = request.auth.credentials;

    if (!categoryGroups.includes(category)) {
      return h.response({ message: "Valid category is required" }).code(400);
    }

    // Check if the title already exists
    const existingPostsSnapshot = await db
      .collection("posts")
      .where("title", "==", tittle)
      .get();

    if (!existingPostsSnapshot.empty) {
      return h
        .response({ message: "This Destination Already Listed" })
        .code(400);
    }

    const blob = bucket.file(
      `post-destination/${Date.now()}_${image.hapi.filename}`
    );
    const blobStream = blob.createWriteStream({
      metadata: { contentType: image.hapi.headers["content-type"] },
    });

    console.log("Creating buffer from image stream...");

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      image.on("data", (chunk) => chunks.push(chunk));
      image.on("end", () => resolve(Buffer.concat(chunks)));
      image.on("error", (err) => reject(err));
    });

    console.log("Buffer created successfully");

    blobStream.on("error", (err) => {
      console.error("Error in blobStream:", err);
      return h
        .response({ message: "Failed to upload image", error: err.message })
        .code(500);
    });

    return new Promise((resolve, reject) => {
      blobStream.on("finish", async () => {
        try {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          const postRef = db.collection("posts").doc();
          const postId = postRef.id;

          console.log("Setting document in Firestore...");

          await postRef.set({
            title: tittle,
            longitude,
            latitude,
            description,
            imageUrl: publicUrl,
            authorName,
            userId, // Add userId here
            address,
            category,
            ratings: [],
            comments: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Document set successfully in Firestore");

          resolve(
            h
              .response({
                message: "Post created successfully",
                post: {
                  postId,
                  authorName,
                  userId,
                  title: tittle,
                  longitude,
                  latitude,
                  description,
                  imageUrl: publicUrl,
                  address,
                  category,
                },
              })
              .code(201)
          );
        } catch (err) {
          console.error("Error in Firestore operation:", err);
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
    console.error("Error in createPost function:", err);
    return h
      .response({ message: "Server error", error: err.message })
      .code(500);
  }
};

const getPosts = async (request, h) => {
  const { category } = request.query;

  let query = db.collection("posts");

  if (category && categoryGroups.includes(category)) {
    query = query.where("category", "==", category);
  }

  try {
    const snapshot = await query.get();
    const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return h.response(posts).code(200);
  } catch (err) {
    console.error("Error fetching posts: ", err);
    return h
      .response({ message: "Error fetching posts", error: err.message })
      .code(500);
  }
};

// Dummy implementations for other functions
const searchPosts = async (request, h) => {
  console.log("searchPosts called with query:", request.query);
  const { category } = request.query;
  const isAllCategory = category.toLowerCase().includes("all");

  if (!category) {
    console.log("Category parameter is required");
    return h.response({ message: "Category parameter is required" }).code(400);
  }

  if (!categoryGroups.includes(category) && !isAllCategory) {
    return h.response({ message: "Valid category is required" }).code(400);
  }

  try {
    let postsRef = db.collection("posts");
    let query = isAllCategory
      ? postsRef
      : postsRef.where("category", "==", category);

    const querySnapshot = await query.get();

    console.log("Processing results...");
    const results = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      totalRating: doc.data().totalRating?.toFixed(2) ?? 0,
    }));

    if (results.length === 0) {
      console.log("No results found for category:", category);
      return h.response({ message: "Tourist destination not found" }).code(404);
    }

    console.log("Returning results...");
    return h.response(results).code(200);
  } catch (err) {
    console.error("Error searching posts:", err);
    return h
      .response({ message: "Error searching posts", error: err.message })
      .code(500);
  }
};

const ratePost = async (request, h) => {
  const { postId } = request.params;
  const { rating } = request.payload;
  const userId = request.auth.credentials.userId;

  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    return h.response({ message: "Invalid rating" }).code(400);
  }

  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return h.response({ message: "Post not found" }).code(404);
    }

    const postData = postDoc.data();
    const ratings = postData.ratings || [];

    // Check if the user has already rated this post
    const existingRatingIndex = ratings.findIndex((r) => r.userId === userId);
    if (existingRatingIndex > -1) {
      return h
        .response({ message: "User has already rated this post" })
        .code(400);
    }

    // Add the new rating
    ratings.push({ userId, rating: parseInt(rating, 10) });

    const newRating =
      ratings.reduce((sum, r) => +sum + +r.rating, 0) / ratings.length;
    console.log("New rating:", newRating);

    // Update the post with the new ratings array
    await postRef.update({ ratings, totalRating: newRating.toFixed(2) });

    return h
      .response({ message: "Rating added successfully", ratings })
      .code(200);
  } catch (error) {
    console.error("Error rating post: ", error);
    return h
      .response({ message: "Server error", error: error.message })
      .code(500);
  }
};

const addComment = async (request, h) => {
  try {
    const { postId } = request.params;
    const { comment } = request.payload;
    const userId = request.auth.credentials.userId;
    const username = request.auth.credentials.username;

    console.log("Decoded token:", request.auth.credentials); // Log the decoded token
    console.log("Request payload:", typeof request.payload); // Log the entire payload

    if (!userId || !username) {
      return h
        .response({ message: "User ID and username are required" })
        .code(400);
    }

    console.log(comment);
    if (!comment || comment.trim() === "") {
      return h.response({ message: "Comment is required" }).code(400);
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return h.response({ message: "Post not found" }).code(404);
    }

    // const postData = postDoc.data();
    // const comments = postData.comments || [];

    // comments.push({
    //   userId,
    //   username,
    //   comment,
    //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
    // });

    await postRef.set(
      {
        comments: [
          ...postDoc.data().comments,
          {
            userId,
            username,
            comment,
            // createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        ],
      },
      { merge: true }
    );

    return h.response({ message: "Comment added successfully" }).code(200);
  } catch (err) {
    console.error("Error in addComment function:", err);
    return h
      .response({ message: "Server error", error: err.message })
      .code(500);
  }
};

const updatePost = async (request, h) => {
  return h.response({ message: "updatePost not implemented" }).code(501);
};

const deletePost = async (request, h) => {
  return h.response({ message: "deletePost not implemented" }).code(501);
};

const getUserPosts = async (request, h) => {
  return h.response({ message: "getUserPosts not implemented" }).code(501);
};

module.exports = {
  createPost,
  getPosts,
  searchPosts,
  updatePost,
  deletePost,
  getUserPosts,
  ratePost, // Add this line
  addComment, // Add this line
};
