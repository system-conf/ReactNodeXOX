const express = require('express');
const Pusher = require('pusher');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // JSON body parsing middleware

const pusher = new Pusher({
  app_id = "1806180"
  key = "7c84220d65bea08859f5"
  secret = "e7ea56a0411dab4f758d"
  cluster = "eu"
  useTLS: true
});

let rooms = {}; // Oda ve oyuncu bilgilerini saklamak için

app.post('/join', (req, res) => {
  const { room, name } = req.body;
  if (!rooms[room]) {
    rooms[room] = { players: [], board: Array(9).fill(null), isXNext: true };
  }

  if (rooms[room].players.length < 2) {
    const symbol = rooms[room].players.length === 0 ? 'X' : 'O';
    rooms[room].players.push({ name, symbol });

    if (rooms[room].players.length === 2) {
      const playerX = rooms[room].players.find(player => player.symbol === 'X');
      const playerO = rooms[room].players.find(player => player.symbol === 'O');
      pusher.trigger(room, 'gameStart', { playerX: playerX.name, playerO: playerO.name });
    }
    res.json({ symbol });
  } else {
    res.status(400).json({ error: 'Room is full' });
  }
});

app.post('/move', (req, res) => {
  const { room, board, isXNext, winner, winnerName } = req.body;
  rooms[room].board = board;
  rooms[room].isXNext = isXNext;

  if (winner) {
    pusher.trigger(room, 'move', { board, isXNext, winner, winnerName });
  } else {
    pusher.trigger(room, 'move', { board, isXNext });
  }
  res.sendStatus(200);
});

app.post('/restart', (req, res) => {
  const { room } = req.body;
  if (rooms[room]) {
    rooms[room].board = Array(9).fill(null);
    rooms[room].isXNext = true;
    pusher.trigger(room, 'restart', {});
  }
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
