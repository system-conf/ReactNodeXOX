import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import './App.css';

const clickSound = new Audio('/click.mp3');
const winSound = new Audio('/win.mp3');

function App() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winnerName, setWinnerName] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!room) return;

    const pusher = new Pusher('7c84220d65bea08859f5', {
      cluster: 'eu',
    });

    const channel = pusher.subscribe(room);

    channel.bind('gameStart', ({ playerX, playerO }) => {
      console.log(`Game started between ${playerX} and ${playerO}`);
      setGameStarted(true);
    });

    channel.bind('move', (data) => {
      setBoard(data.board);
      setIsXNext(data.isXNext);
      setWinner(data.winner);
      setWinnerName(data.winnerName);
    });

    channel.bind('restart', () => {
      setBoard(Array(9).fill(null));
      setWinner(null);
      setWinnerName(null);
      setIsXNext(true);
      setGameStarted(true);
    });

    return () => {
      pusher.unsubscribe(room);
    };
  }, [room]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every(square => square !== null)) {
      return 'Berabere';
    }

    return null;
  };

  const handleClick = async (index) => {
    if (!gameStarted || winner || board[index] || playerSymbol !== (isXNext ? 'X' : 'O')) return;

    const newBoard = board.slice();
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const calculatedWinner = calculateWinner(newBoard);
    let calculatedWinnerName = null;
    if (calculatedWinner) {
      calculatedWinnerName = calculatedWinner === playerSymbol ? name : 'Diğer Oyuncu';
      setWinner(calculatedWinner);
      setWinnerName(calculatedWinnerName);
      winSound.play();
    }

    await fetch('https://xoxreact-servers.vercel.app/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room,
        board: newBoard,
        isXNext: !isXNext,
        winner: calculatedWinner,
        winnerName: calculatedWinnerName,
      }),
    });

    clickSound.play();
  };

  const handleRestart = async () => {
    await fetch('https://xoxreact-servers.vercel.app/restart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room }),
    });
  };

  const joinRoom = async () => {
    if (name && room) {
      const response = await fetch('https://xoxreact-servers.vercel.app/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, room }),
      });
      const data = await response.json();
      setPlayerSymbol(data.symbol);
      setConnected(true);
    }
  };

  const renderSquare = (index) => (
    <button className="square" onClick={() => handleClick(index)}>
      {board[index]}
    </button>
  );

  const status = winner
    ? winner === 'Berabere'
      ? 'Berabere!'
      : `Kazanan: ${winnerName}`
    : gameStarted
    ? `Sıradaki oyuncu: ${isXNext ? 'X' : 'O'}`
    : 'Diğer oyuncunun bağlanmasını bekleyin...';

  return (
    <div className="app">
      {!connected ? (
        <div className="join-form">
          <input
            className="input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button className="button" onClick={joinRoom}>
            Join Room
          </button>
        </div>
      ) : (
        <div>
          <div className="status">{status}</div>
          <div className="board">
            {[0, 1, 2].map((row) => (
              <div key={row} className="board-row">
                {[0, 1, 2].map((col) => renderSquare(row * 3 + col))}
              </div>
            ))}
          </div>
          {winner && (
            <button className="button" onClick={handleRestart}>
              Tekrar Oyna
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
