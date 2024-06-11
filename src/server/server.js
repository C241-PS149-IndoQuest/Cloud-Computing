"use strict";

const Hapi = require("@hapi/hapi");
const userController = require("../controllers/userController"); // Import userController

const init = async () => {
  const server = Hapi.server({
    port: 8080,
    host: "localhost",
  });

  server.route({
    method: "POST",
    path: "/register",
    handler: userController.register, // Referensikan handler dari userController
  });

  server.route({
    method: "POST",
    path: "/login",
    handler: userController.login, // Referensikan handler dari userController
  });

  server.route({
    method: "GET",
    path: "/fetchUser",
    handler: userController.fetchUser, // Referensikan handler dari userController
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
