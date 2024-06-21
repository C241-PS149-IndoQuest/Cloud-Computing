require("dotenv").config();
const Hapi = require("@hapi/hapi");
const Inert = require("@hapi/inert");
const bodyParser = require("hapi-bodyparser");
const Joi = require("@hapi/joi");
const path = require("path");
const fs = require("fs");
const userController = require("./src/controllers/userController");
const postController = require("./src/controllers/postController");
const userRoutes = require("./src/routes/userRoutes");
const postRoutes = require("./src/routes/post");
const {
  getCollaborativeRecommendations,
} = require("./src/controllers/mlCollaborative");
const {
  getContentBasedRecommendations,
} = require("./src/controllers/mlRecomendation");

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: "localhost",
    routes: {
      cors: {
        origin: ["*"],
        headers: ["Accept", "Content-Type"],
        exposedHeaders: ["Accept", "Content-Type"],
        additionalExposedHeaders: ["Authorization"],
        maxAge: 60,
        credentials: true,
      },
    },
  });

  await server.register(Inert);

  // Route for user registration
  server.route({
    method: "POST",
    path: "/register",
    options: {
      payload: {
        maxBytes: 10485760, // 10 MB
        output: "data", // Use "data" to parse the payload as a data object
        parse: true, // Parse the payload
        allow: ["application/json", "application/x-www-form-urlencoded"],
        multipart: true, // Enable multipart/form-data support
      },
    },
    handler: userController.register,
  });

  // Route for user login
  server.route({
    method: "POST",
    path: "/login",
    options: {
      payload: {
        allow: ["application/json", "application/x-www-form-urlencoded"], // Allow JSON and x-www-form-urlencoded
        parse: true,
      },
    },
    handler: (request, h) => {
      console.log("Login route hit");
      return userController.login(request, h);
    },
  });

  // Route to fetch user details
  server.route({
    method: "GET",
    path: "/fetchUser",
    handler: userController.fetchUser,
  });

  server.route({
    method: "GET",
    path: "/recommendations",
    handler: async (request, h) => {
      const destinationName = request.query.destinationName;
      const recommendations = await getContentBasedRecommendations(
        destinationName
      );
      return h.response(recommendations).code(200);
    },
    options: {
      validate: {
        query: Joi.object({
          destinationName: Joi.string()
            .required()
            .description("The name of the destination for recommendations"),
        }),
      },
      description: "Get Recommendations",
      notes:
        "Returns a list of recommended destinations based on a given destination name",
      tags: ["api"],
    },
  });

  // Route for collaborative filtering recommendations
  server.route({
    method: "GET",
    path: "/collaborative-recommendations",
    handler: async (request, h) => {
      const userId = request.query.userId;
      const recommendations = await getCollaborativeRecommendations(userId);
      return h.response(recommendations).code(200);
    },
    options: {
      validate: {
        query: Joi.object({
          userId: Joi.string()
            .required()
            .description(
              "The ID of the user for collaborative filtering recommendations"
            ),
        }),
      },
      description: "Get Collaborative Filtering Recommendations",
      notes:
        "Returns a list of recommended places based on collaborative filtering",
      tags: ["api"],
    },
  });

  // Add user routes
  userRoutes.forEach((route) => server.route(route));

  // Add post routes
  postRoutes.forEach((route) => server.route(route));

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

// Initialize the server
init();
