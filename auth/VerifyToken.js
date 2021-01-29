const User = require('../models/user');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function verifyToken(req, res, next) {
  let token = req.header('Authorization');
  if (!token) return res.status(401).send("Access Denied");

  try {
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trimLeft();
    }
    const verified = jwt.verify(token, config.secret);
    userId = verified.id;
    try {
      user = await User.findById(userId);
      role = user.role;

      if (role === 'USER') {
        let req_url = req.originalUrl;
        let method = req.method;
        if ((req_url.includes("games/leaderboard") || req_url.includes("players")) && method === "get") {
          req.user = verified;
          next();
        } else {
          return res.status(401).send("Unauthorized!");
        }
      }
      if (role === "ADMIN") {
        req.user = verified;
        next();
      }
    } catch (error) {
      res.json('User not in DB');
      return
    }

  }
  catch (err) {
    res.status(400).send("Invalid Token");
  }
}
module.exports = verifyToken;