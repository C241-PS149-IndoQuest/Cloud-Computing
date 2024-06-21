//post.js
const postController = require("../controllers/postController");
const userController = require("../controllers/userController");
const { verifyToken } = require("../middlewares/authMiddlewares");

const postRoutes = [
  {
    method: "POST",
    path: "/upload",
    options: {
      pre: [{ method: verifyToken }],
      payload: {
        parse: true,
        multipart: { output: "stream" },
        maxBytes: 10485760, // 10 MB file size limit
      },
      handler: postController.createPost,
    },
  },
  {
    method: "GET",
    path: "/getPost",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.getPosts,
    },
  },
  {
    method: "PUT",
    path: "/updatePost/{id}",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.updatePost,
    },
  },
  {
    method: "DELETE",
    path: "/deletePost/{id}",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.deletePost,
    },
  },
  {
    method: "GET",
    path: "/getUserPosts",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.getUserPosts,
    },
  },
  {
    method: "GET",
    path: "/searchPosts",
    options: {
      pre: [{ method: verifyToken }],
      handler: postController.searchPosts,
    },
  },
];

module.exports = postRoutes;
