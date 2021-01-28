const mongoose = require('mongoose');

const tmpSchema = mongoose.Schema({
  point1: {
    type: Number,
    default: 0
  },
  point2: {
    type: Number,
    default: 0
  },
  logid: {
    type: String,
    required: true
  },
  gameid: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Tmp", tmpSchema);