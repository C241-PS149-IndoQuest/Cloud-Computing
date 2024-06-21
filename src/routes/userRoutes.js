const userController = require("../controllers/userController");
const postController = require("../controllers/postController");
const { verifyToken } = require("../middlewares/authMiddlewares");
const { config } = require("dotenv");

const userRoutes = [
  {
    method: "GET",
    path: "/profile",
    options: {
      pre: [{ method: verifyToken }],
      handler: userController.getUserProfile,
    },
  },
  {
    method: "PUT",
    path: "/profile/picture",
    options: {
      pre: [{ method: verifyToken }],
      payload: {
        parse: true,
        multipart: { output: "stream" },
        maxBytes: 10485760, // 10 MB file size limit
      },
    },
    handler: userController.updateUserProfilePicture,
  },
  {
    method: "PUT",
    path: "/profile",
    options: {
      pre: [{ method: verifyToken }],
      handler: userController.updateUserProfile,
    },
  },
  {
    method: "POST",
    path: "/posts/{postId}/rate",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.ratePost,
    },
  },
  {
    method: "POST",
    path: "/posts/{postId}/comment",
    options: {
      pre: [{ method: verifyToken }],
      payload: {
        parse: true,
      },
      handler: postController.addComment,
    },
  },
];

module.exports = userRoutes;
