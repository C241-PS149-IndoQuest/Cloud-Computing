// routes/authRoutes.js
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("../controllers/userController");
const { verifyToken } = require("../middlewares/authMiddleware");

const routes = [
  {
    method: "POST",
    path: "/register",
    handler: registerUser,
  },
  {
    method: "POST",
    path: "/login",
    handler: loginUser,
  },
  {
    method: "POST",
    path: "/logout",
    options: {
      pre: [{ method: verifyToken }],
    },
    handler: logoutUser,
  },
];

module.exports = routes;
