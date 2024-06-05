// server.js
const Hapi = require("@hapi/hapi");
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("../controllers/userController");
require("dotenv").config();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 8080,
    host: "localhost",
  });

  server.route([
    { method: "POST", path: "/register", handler: registerUser },
    { method: "POST", path: "/login", handler: loginUser },
    { method: "POST", path: "/logout", handler: logoutUser },
  ]);

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
