const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passwordHash = require('password-hash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

router.post('/register', function (req, res) {

  var hashedPassword = bcrypt.hashSync(req.body.password, 8);

  User.create({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword
  },
    function (err, user) {
      if (err) return res.status(500).send("There was a problem registering the user.")
      // create a token
      var token = jwt.sign({ id: user._id }, config.secret, {
        expiresIn: 86400 // expires in 24 hours
      });
      res.status(200).send({ auth: true, token: token });
    });
});

router.get('/login', async function (req, res) {
  user = await User.findOne({ email: req.body.email });
  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (err) return res.status(500).send("There was a problem registering the user.")
    if (result) {
      var token = jwt.sign({ id: user._id }, config.secret, {
        expiresIn: 86400 // expires in 24 hours
      });
      res.status(200).send({ auth: true, token: token });
    } else {
      res.json({message: "Password not match"});
      return;
    }
  })

});

module.exports = router;