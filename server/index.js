const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://xoxreact-client.vercel.app",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "https://xoxreact-client.vercel.app",
  methods: ["GET", "POST"]
}));

let rooms = {}; // Oda ve oyuncu bilgilerini saklamak için

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', ({ room, name }) => {
    socket.join(room);
    console.log(`${name} joined room ${room}`);

    if (!rooms[room]) {
      rooms[room] = { players: [], board: Array(9).fill(null), isXNext: true };
    }

    if (rooms[room].players.length < 2) {
      const symbol = rooms[room].players.length === 0 ? 'X' : 'O';
      rooms[room].players.push({ name, symbol });
      socket.emit('assignSymbol', symbol);
    }

    if (rooms[room].players.length === 2) {
      const playerX = rooms[room].players.find(player => player.symbol === 'X');
      const playerO = rooms[room].players.find(player => player.symbol === 'O');
      io.to(room).emit('gameStart', { playerX: playerX.name, playerO: playerO.name });
    }

    socket.on('move', (data) => {
      if (rooms[room].players.length < 2) return; // Oda dolmadan hamleleri kabul etmeyin

      rooms[room].board = data.board;
      rooms[room].isXNext = data.isXNext;

      if (data.winner && data.winner !== 'Berabere') {
        const winnerPlayer = rooms[room].players.find(player => player.symbol === data.winner);
        data.winnerName = winnerPlayer ? winnerPlayer.name : 'Unknown';
      } else {
        data.winnerName = 'Berabere';
      }
      io.to(room).emit('move', data);
    });

    socket.on('restart', () => {
      if (rooms[room]) {
        rooms[room].board = Array(9).fill(null);
        rooms[room].isXNext = true;
        io.to(room).emit('restart');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      if (rooms[room]) {
        rooms[room].players = rooms[room].players.filter(player => player.name !== name);
        if (rooms[room].players.length === 0) {
          delete rooms[room];
        }
      }
    });
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
