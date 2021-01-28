const mongoose = require('mongoose');

const logSchema = mongoose.Schema({
  point1: {
    type: Number,
    default: 0
  },
  point2: {
    type: Number,
    default: 0
  },
  gameId: String,
  ingame: {
    type: Boolean,
    default: 1 
  },
  step: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Log", logSchema);