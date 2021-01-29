const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')


require('dotenv/config');

app.use(bodyParser.json());

// Import routers
const playerRoute = require('./routes/player');
const gameRoute = require('./routes/game');
const authRoute = require('./routes/AuthController');


app.use('/', authRoute);
app.use('/players', playerRoute);
app.use('/games', gameRoute);

app.get('/', (req, res) => {
  res.send('Okkk');
});



//Connect to DB
mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true }, function (err, db) {
  if (err) throw err
  console.log("Db connected")
})


app.listen(3000);