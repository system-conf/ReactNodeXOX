const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

let rooms = {}; // Oda ve oyuncu bilgilerini saklamak için
let pendingRequests = {}; // Bekleyen long-polling isteklerini saklamak için

// Long-polling endpoint
app.get('/poll/:room', (req, res) => {
  const room = req.params.room;

  if (!rooms[room]) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!pendingRequests[room]) {
    pendingRequests[room] = [];
  }

  pendingRequests[room].push(res);

  // Yeni veri geldiğinde bekleyen tüm istekleri yanıtla
  setTimeout(() => {
    const responses = pendingRequests[room] || [];
    responses.forEach(pendingRes => {
      pendingRes.json({ board: rooms[room].board, isXNext: rooms[room].isXNext });
    });
    pendingRequests[room] = [];
  }, 30000); // 30 saniye bekletme süresi
});

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
      notifyPlayers(room, { playerX: playerX.name, playerO: playerO.name });
    }
    res.json({ symbol });
  } else {
    res.status(400).json({ error: 'Room is full' });
  }
});

app.post('/move', (req, res) => {
  const { room, board, isXNext, winner, winnerName } = req.body;
  if (rooms[room]) {
    rooms[room].board = board;
    rooms[room].isXNext = isXNext;

    notifyPlayers(room, { board, isXNext, winner, winnerName });
  }
  res.sendStatus(200);
});

app.post('/restart', (req, res) => {
  const { room } = req.body;
  if (rooms[room]) {
    rooms[room].board = Array(9).fill(null);
    rooms[room].isXNext = true;

    notifyPlayers(room, { board: rooms[room].board, isXNext: rooms[room].isXNext });
  }
  res.sendStatus(200);
});

function notifyPlayers(room, data) {
  if (pendingRequests[room]) {
    pendingRequests[room].forEach(res => res.json(data));
    pendingRequests[room] = [];
  }
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
