const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    point: {
        type: Number,
        default: 0
    },
    wincount: {
        type: Number,
        default: 0
    },
    losecount: {
        type: Number,
        default: 0
    },
    islogin: {
        type: Boolean,
        default: 1
    },
    ingame: {
        type: Boolean,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Player', playerSchema);