const mongoose = require('mongoose');

const GameSchema = mongoose.Schema({
    players: {
        type: Array,
        required: true
    },
    winner: {
        type: String,
        default: ""
    },
    ingame: {
        type: Boolean,
        default: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Game", GameSchema);