const jwt = require("jsonwebtoken");

const verifyToken = async (request, h) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return h
      .response("A token is required for authentication")
      .code(403)
      .takeover();
  }

  try {
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Log the decoded token
    request.auth = {
      credentials: decoded,
    };
  } catch (err) {
    return h.response("Invalid Token").code(401).takeover();
  }

  return h.continue;
};

module.exports = {
  verifyToken,
};
