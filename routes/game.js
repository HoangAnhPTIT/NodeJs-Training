const express = require('express');
const router = express.Router();
const Game = require('../models/game');
const Player = require('../models/player');
const Log = require('../models/log');
const Tmp = require('../models/tmp')
const { route } = require('./player');
const { json } = require('body-parser');

const verifyToken = require('../auth/VerifyToken');
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    games = await Game.find();
    res.json(games);
  } catch (err) {
    res.json(err);
  }

});

// Start Game
router.post('/', async (req, res) => {
  players = req.body.players;
  player1 = await findPlayer(players[0]);
  player2 = await findPlayer(players[1]);
  if (players[0] === players[1] || player1 === null || player2 === null) {
    res.json({ message: "Player's id invalid" });
    return;
  }
  if (player1.ingame || player2.ingame) {
    res.json({ message: "Player in game" });
    return;
  }
  try {
    await Player.updateOne({ _id: player1._id }, { ingame: true })
    await Player.updateOne({ _id: player2._id }, { ingame: true })

    const game = new Game({
      players: req.body.players
    });
    gameSaved = await game.save();
    const log = new Log({
      gameId: gameSaved._id
    });
    logSaved = await log.save();
    gameJson = {
      id: gameSaved._id, winner: "", players: [
        {
          id: player1._id,
          point: 0
        },
        {
          id: player2._id,
          point: 0
        }
      ]
    };
    res.json({ game: gameJson });
  } catch (err) {
    res.json(err);
  }

});

// Score Point
router.post('/:gameid/score', async (req, res) => {
  const gameId = req.params.gameid;
  const playerId = req.body.player_id;
  gameDB = await findGame(gameId, true);
  if (gameDB === null) {
    res.json({ message: "Game's id invalid" });
    return;
  }
  player = await findPlayer(playerId);
  if (player === null) {
    res.json({ message: "Player's id invalid" });
    return;
  }
  numberPlayer = findNumberPlayer(gameDB, playerId);
  if (numberPlayer === 0) {
    res.json({ message: "Player not in this game" });
    return;
  }
  await Player.updateOne({ _id: playerId }, { point: player.point + 10 })
  await updatePointLog(gameId, res);

});


// Reset point
router.delete('/:gameId/reset_point', async (req, res) => {
  const gameId = req.params.gameId;
  const playerId = req.body.player_id;
  const step = parseInt(req.body.step, 10); // Limit for step !!!!!
  if (await checkStepToReset(gameId, step) === 0) {
    res.json({ message: "Reset too limited, You can reset for step which < 6 or not exceed count document" });
    return;
  }
  gameDB = await findGame(gameId, true);
  if (gameDB === null) {
    res.json({ message: "Game's id invalid Or Game Is End" });
    return;
  }
  if (playerId === undefined) {
    // Reset has not player id
    await resetNoPlayer(gameId, step);
    res.json({ message: "Reset Done !!!" });
  } else {
    // Reset has player id
    await resetPlayer(playerId, gameId, step, gameDB);
    res.json({ message: "Reset has player Done !!!" });

  }
});


// Revert point
router.put('/:gameId/revert_point', async (req, res) => {
  const gameId = req.params.gameId;
  const playerId = req.body.player_id;
  const step = parseInt(req.body.step, 10); // Limit for step !!!!!

  gameDB = await findGame(gameId, true);
  if (gameDB === null) {
    res.json({ message: "Game's id invalid Or Game Is End" });
    return;
  }
  if (await checkStepToRevert(gameId, step) === 0) {
    res.json({ message: "Step not matching" });
    return;
  }
  if (playerId === undefined) {
    // Revert has not player id
    await revertNoPlayer(gameId, step, gameDB);
    res.json({ message: 'Revert Done !!!' })
  } else {
    // Revert has player id
    checkNumPlayer = await revertPlayer(gameId, step, gameDB, playerId);
    if (checkNumPlayer == 0) {
      res.json({ message: "Player's id invalid" });
      return;
    }
    res.json({ message: 'Revert has player Done!!!' });
  }
});

// End game
router.put('/:gameId/end_game', async (req, res) => {
  const gameId = req.params.gameId;
  gameDB = await findGame(gameId, true);
  if (gameDB === null) {
    res.json({ message: "Game's id invalid or game was end" });
    return;
  }

  try {
    logLast = await Log.findOne({ gameId: gameId, ingame: true });
    await Log.updateOne({ _id: logLast._id }, { ingame: false, step: 0 });

    await updateWinner(gameDB, gameId, logLast);
    await deleteRenundantTmps(gameId);

    renderJsonEndGame(gameId, gameDB, logLast);
  } catch (error) {
    res.json(error);
  }

});

// Get Game Detail
router.get('/:gameId/', async (req, res) => {
  const gameId = req.params.gameId;
  gameDB = await findGame(gameId, false);
  if (gameDB === null) {
    res.json({ message: "Game's id invalid or game was not end" });
    return;
  }
  renderJsonGameDetail(gameDB, res);
});

// Get leaderboard
router.get('/leaderboard/:page/:limit', async (req, res) => {
  const page = parseInt(req.params.page);
  const limit = parseInt(req.params.limit);
  const skip = (page - 1) * limit;

  countPlayer = await Player.count();
  if(page >= Math.ceil(countPlayer/page)){
    res.json({message: "Page too large"});
    return;
  }
  players = await Player.find();
  players.sort((element1, element2) => {
    return element1.wincount - element1.losecount < element2.wincount - element2.losecount;
  })
  playersJson = [];
  for (let i = skip; i < skip + limit; i++) {
    if (i >= players.length) {
      break;
    }
    playerJson = {
      id: players[i]._id,
      name: players[i].fullname,
      wincount: players[i].wincount,
      losecount: players[i].losecount
    }
    playersJson.push(playerJson);
  }

  res.json({ players: playersJson });
});


async function renderJsonGameDetail(gameDB, res) {
  winner = gameDB.winner;
  players = gameDB.players;
  _id = gameDB._id;
  player1 = await Player.findOne({ _id: players[0] });
  player2 = await Player.findOne({ _id: players[1] });
  gameJson = {
    id: _id, winner: winner, players: [
      {
        id: players[0],
        point: player1.point
      },
      {
        id: players[1],
        point: player2.point
      }
    ]
  }
  res.json({ game: gameJson });
}

async function updatePointLog(gameId, res) {
  try {
    logDB = await Log.findOne({ gameId: gameId, ingame: true });
    await Log.updateOne({ _id: logDB._id }, { ingame: false });
    point1Update = 0;
    point2Update = 0;
    if (numberPlayer === 1) {
      point1Update = logDB.point1 + 10;
      point2Update = logDB.point2;
    } else {
      point1Update = logDB.point1
      point2Update = logDB.point2 + 10;
    }
    log = new Log({
      gameId: gameId,
      point1: point1Update,
      point2: point2Update
    })
    logSaved = await log.save();
    renderJsonScorePoint(gameDB, gameId, point1Update, point2Update, res);
  } catch (error) {
    res.json(error)
  }


}

async function renderJsonScorePoint(gameDB, gameId, point1Update, point2Update, res) {
  players = gameDB.players;
  gameJson = {
    id: gameId,
    winner: "",
    players: [
      {
        id: players[0],
        point: point1Update
      },
      {
        id: players[1],
        point: point2Update
      }
    ]
  }
  res.json({ game: gameJson });
}

async function renderJsonEndGame(gameId, gameDB, logLast) {
  players = gameDB.players;
  res.json({
    id: gameId, winner: "", players: [
      {
        id: players[0],
        point: logLast.point1
      },
      {
        id: players[1],
        point: logLast.point2
      }
    ]
  });
}

async function updateWinner(gameDB, gameId, logLast) {
  players = gameDB.players;
  player1 = await Player.findById(players[0]);
  player2 = await Player.findById(players[1]);

  if (logLast.point1 > logLast.point2) {
    await Player.updateOne({ _id: player1._id }, { wincount: player1.wincount + 1, ingame: false });
    await Player.updateOne({ _id: player2._id }, { losecount: player2.losecount + 1, ingame: false });
    await Game.updateOne({ _id: gameId }, { winner: player1.fullname, ingame: false });
  } else if (logLast.point1 < logLast.point2) {
    await Player.updateOne({ _id: player1._id }, { losecount: player1.losecount + 1, ingame: false });
    await Player.updateOne({ _id: player2._id }, { wincount: player2.wincount + 1, ingame: false });
    await Game.updateOne({ _id: gameId }, { winner: player2.fullname, ingame: false });

  } else {
    await Game.updateOne({ _id: gameId }, { winner: 'Nobody', ingame: false });

  }
}

async function deleteRenundantTmps(gameId) {
  tmps = await Tmp.find({ gameid: gameId });
  tmps.forEach(tmp => {
    Tmp.deleteOne({ _id: tmp._id });
  });
}


async function revertPlayer(gameId, step, gameDB, playerId) {
  numPlayer = findNumberPlayer(gameDB, playerId);

  try {
    tmps = await Tmp.find({ gameid: gameId }).select('point1 point2 logid').sort({ logid: -1 }).limit(step);
    checkNumPlayer = await updatePointForPlayerRevert(tmps, gameDB, numPlayer);
    if (checkNumPlayer === 0) {
      return 0;
    }
    return 1;
  } catch (error) {
    console.log(error);
  }

}

async function updatePointForPlayerRevert(tmps, gameDB, numPlayer) {
  try {
    if (numPlayer === 0) {
      return 0;
    }
    if (numPlayer === 1) {
      updatePointPlayer1Revert(tmps, gameDB)
    }
    if (numPlayer === 2) {
      updatePointPlayer2Revert(tmps, gameDB)
    }

    tmpFirst = tmps[0];
    await Log.updateOne({ _id: tmpFirst.logid }, { step: 0 });
    if (numPlayer == 1) {
      tmps.forEach(async tmp => {
        await Log.updateOne({ _id: tmp.logid }, { point1: tmp.point1 });
        await Tmp.deleteOne({ _id: tmp._id });
      });
    }
    if (numPlayer == 2) {
      tmps.forEach(async tmp => {
        await Log.updateOne({ _id: tmp.logid }, { point2: tmp.point2 });
        await Tmp.deleteOne({ _id: tmp._id });
      });
    }
    return 1;
  } catch (error) {
    console.log(error);
  }
}

async function updatePointPlayer1Revert(tmps, gameDB) {
  tmpFirst = tmps[0];
  tmpLast = tmps[tmps.length - 1];
  point1change = tmpFirst.point1 - tmpLast.point1;
  players = gameDB.players;
  player1 = await Player.findById(players[0]);
  try {
    await Player.updateOne({ _id: players[0] }, { point: player1.point + point1change });
  } catch (error) {
    console.log(error);
  }

}

async function updatePointPlayer2Revert(tmps, gameDB) {
  tmpFirst = tmps[0];
  tmpLast = tmps[tmps.length - 1];
  point2change = tmpFirst.point2 - tmpLast.point2;
  players = gameDB.players;
  player2 = await Player.findById(players[1]);
  try {
    await Player.updateOne({ _id: players[1] }, { point: player2.point + point2change });
  } catch (error) {
    console.log(error);
  }
}


async function resetPlayer(playerId, gameId, step, gameDB) {
  numPlayer = findNumberPlayer(gameDB, playerId);

  try {
    logs = await Log.find({ gameId: gameId }).select('point1 point2').sort({ _id: -1 }).limit(step);
    if (numPlayer === 0) {
      res.json({ message: "Player's id invalid" });
      return;
    }
    if (numPlayer === 1) {
      checkPoint = await updatePointPlayer1Reset(gameId, logs);
    }
    if (numPlayer === 2) {
      checkPoint = await updatePointPlayer2Reset(gameId, logs);
    }
    if (checkPoint === 0) {
      res.json({ message: 'Can not reset for point < 0' })
      return;
    }
    await updatePointLogPlayerReset(logs, step, numPlayer);
    logs.forEach(async log => {
      tmp = createTmp(log, gameId, numPlayer);
      tmpSaved = await tmp.save();
    });

  } catch (error) {
    console.log(error);
  }
}
async function updatePointLogPlayerReset(logs, step, numPlayer) {
  const logLast = logs[logs.length - 1];
  const logFirst = logs[0];
  console.log(logFirst);
  await Log.updateOne({ _id: logFirst._id }, { step: step });
  try {
    if (numPlayer === 1) {
      for (let i = 0; i < logs.length - 1; i++) {
        await Log.updateOne({ _id: logs[i]._id }, { point1: logLast.point1 })
      }
    }
    if (numPlayer === 2) {
      for (let i = 0; i < logs.length - 1; i++) {
        await Log.updateOne({ _id: logs[i]._id }, { point2: logLast.point2 })
      }
    }
  } catch (error) {
    console.log(error);
  }
}


async function updatePointPlayer1Reset(gameId, logs) {
  const logFirst = logs[0];
  const logLast = logs[logs.length - 1];
  point1change = logFirst.point1 - logLast.point1;
  try {
    game = await Game.findById(gameId);
    player1Id = game.players[0];
    player1 = await Player.findById(player1Id);
    point1ToUpdate = player1.point - point1change;
    if (point1ToUpdate < 0) {
      return 0;
    }
    await Player.updateOne({ _id: player1Id }, { point: point1ToUpdate });

  } catch (error) {
    console.log(error);
  }
}
async function updatePointPlayer2Reset(gameId, logs, numPlayer) {
  const logFirst = logs[0];
  const logLast = logs[logs.length - 1];
  point2change = logFirst.point2 - logLast.point2;
  try {
    game = await Game.findById(gameId);
    player2Id = game.players[1];
    player2 = await Player.findById(player2Id);
    point2ToUpdate = player2.point - point2change;
    if (point2ToUpdate < 0) {
      return 0;
    }
    await Player.updateOne({ _id: player2Id }, { point: point2ToUpdate });

  } catch (error) {
    console.log(error);
  }
}
async function revertNoPlayer(gameId, step, gameDB) {
  try {
    tmps = await Tmp.find({ gameid: gameId }).select('point1 point2 logid').sort({ logid: -1 }).limit(step);
    await updatePointForNoPlayerRevert(tmps, gameDB);

  } catch (error) {
    console.log(error);
  }

}


async function updatePointForNoPlayerRevert(tmps, gameDB) {
  try {
    await updatePointNoPlayerRevert(tmps, gameDB);

    tmpFirst = tmps[0];
    await Log.updateOne({ _id: tmpFirst.logid }, { step: 0 });
    tmps.forEach(async tmp => {
      await Log.updateOne({ _id: tmp.logid }, { point1: tmp.point1, point2: tmp.point2 });
      await Tmp.deleteOne({ _id: tmp._id });
    });
  } catch (error) {
    console.log(error);
  }
}


async function updatePointNoPlayerRevert(tmps, gameDB) {
  tmpFirst = tmps[0];
  tmpLast = tmps[tmps.length - 1];
  point1change = tmpFirst.point1 - tmpLast.point1;
  point2change = tmpFirst.point2 - tmpLast.point2;
  players = gameDB.players;
  player1 = await Player.findById(players[0]);
  player2 = await Player.findById(players[1]);
  try {
    await Player.updateOne({ _id: players[0] }, { point: player1.point + point1change });
    await Player.updateOne({ _id: players[1] }, { point: player2.point + point2change });
  } catch (error) {
    console.log(error);
  }

}


async function checkStepToReset(gameId, step) {
  if (step > 5)
    return 0;
  countLog = await Log.count({ gameId: gameId });
  if (step >= countLog)
    return 0;
  return 1;
}

async function checkStepToRevert(gameId, step) {
  logLast = await Log.findOne({ gameId: gameId, ingame: true }).select('step');
  stepDB = logLast.step;
  if (step === stepDB) {
    return 1;
  }
  return 0;
};



async function resetNoPlayer(gameId, step) {
  try {
    logs = await Log.find({ gameId: gameId }).select('point1 point2').sort({ _id: -1 }).limit(step);
    checkPoint = await updatePointNoPlayerReset(gameId, logs);
    if (checkPoint === 0) {
      res.json({ message: 'Can not reset for point < 0' })
      return;
    }
    await updatePointLogNoPlayerReset(logs, step);
    logs.forEach(async log => {
      tmp = createTmp(log, gameId);
      tmpSaved = await tmp.save();
    });

  } catch (error) {
    console.log(error);
  }
}

async function updatePointLogNoPlayerReset(logs, step) {
  const logLast = logs[logs.length - 1];
  const logFirst = logs[0];
  console.log(logFirst);
  await Log.updateOne({ _id: logFirst._id }, { step: step });
  try {
    for (let i = 0; i < logs.length - 1; i++) {
      // console.log(logs[i]._id);
      await Log.updateOne({ _id: logs[i]._id }, { point1: logLast.point1, point2: logLast.point2 })
    }
  } catch (error) {
    console.log(error);
  }
}


function createTmp(log, gameId, numPlayer) {
  if (numPlayer === undefined) {
    point1 = log.point1;
    point2 = log.point2;
  } else if (numPlayer === 1) {
    point1 = log.point1;
    point2 = 0;
  }
  else if (numPlayer === 2) {
    point1 = 0;
    point2 = log.point2;
  }

  return new Tmp({
    point1: point1,
    point2: point2,
    logid: log._id,
    gameid: gameId
  });
}

function findNumberPlayer(gameDB, playerId) {
  players = gameDB.players
  if (playerId === players[0]) return 1;
  else if (playerId === players[1]) return 2;
  else return 0;
}

async function findGame(gameId, ingame) {
  try {
    return await Game.findOne({ _id: gameId, ingame: ingame })
  } catch (error) {
    return null;
  }
}

async function findPlayer(playerId) {
  try {
    player = await Player.findById(playerId);
    return player
  } catch (error) {
    return null;
  }
}

router.delete('/:gameId', async (req, res) => {
  try {
    gameDeleted = await Game.deleteOne({ _id: req.params.gameId })
    res.json(gameDeleted);
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;
