const express = require('express');
const router = express.Router();
const Player = require('../models/player');

router.get('/', async (req, res) => {
    try {
        const players = await Player.find({});
        // console.log(players);
        res.json(players)
    } catch (err) {
        res.json({ message: err })
    }

});

router.post('/', async (req, res) => {
    const player = new Player({
        fullname: req.body.fullname
    });
    try {
        const savedPlayer = await player.save();
        res.json(savedPlayer);
    } catch (err) {
        res.json(err)
    }
});

router.get('/:playerId', async (req, res) => {
    try {
        const player = await Player.findById(req.params.playerId).exec();
        
        res.json(player);
    } catch (err) {
        res.json({ message: "Player's id invalid" })
        return;
    }

});

router.delete('/:playerId', async (req, res) => {
    try {
        deletedPlayer = await Player.deleteOne({ _id: req.params.playerId });
        res.json(deletedPlayer);
    } catch (err) {
        res.json(err)
    }

});

router.put('/:playerId', async (req, res) => {
    try {
        updatedPlayer = await Player.updateOne({ _id: req.params.playerId }, { $set: { fullname: req.body.fullname } })
        res.json(updatedPlayer);
    } catch (err) {
        res.json(err);
    }
});

module.exports = router;