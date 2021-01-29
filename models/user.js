const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role:{
    type: String,
    default: "USER"
  },
  islogin: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("User", userSchema);