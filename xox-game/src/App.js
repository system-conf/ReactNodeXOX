import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { CSSTransition } from 'react-transition-group';
import './App.css'; // CSS dosyasını ekleyin

const clickSound = new Audio('/click.mp3'); // Ses dosyanızı doğru yolda ekleyin
const winSound = new Audio('/win.mp3'); // Kazanma sesini ekleyin

function App() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winnerName, setWinnerName] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState('');
  const [socket, setSocket] = useState(null);
  const [gameStarted, setGameStarted] = useState(false); // Oyunun başlayıp başlamadığını takip edin

  useEffect(() => {
    const newSocket = io('https://xoxreact-server.vercel.app', { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('assignSymbol', (symbol) => {
      setPlayerSymbol(symbol);
    });

    newSocket.on('gameStart', ({ playerX, playerO }) => {
      console.log(`Game started between ${playerX} and ${playerO}`);
      setGameStarted(true); // Oyun başladığında durumu güncelleyin
    });

    newSocket.on('restart', () => {
      setBoard(Array(9).fill(null));
      setWinner(null);
      setWinnerName(null);
      setIsXNext(true);
      setGameStarted(true);
    });

    return () => {
      newSocket.close(); // Bileşen unmount olduğunda soket bağlantısını kapatın
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('move', (data) => {
        setBoard(data.board);
        setIsXNext(data.isXNext);
        setWinner(data.winner);
        setWinnerName(data.winnerName);
      });
    }
  }, [socket]);

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

    // Berabere kontrolü
    if (squares.every(square => square !== null)) {
      return 'Berabere';
    }

    return null;
  };

  const handleClick = (index) => {
    if (!gameStarted || winner || board[index] || playerSymbol !== (isXNext ? 'X' : 'O')) return;

    const newBoard = board.slice();
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const calculatedWinner = calculateWinner(newBoard);
    let calculatedWinnerName = null;
    if (calculatedWinner) {
      calculatedWinnerName = calculatedWinner === playerSymbol ? name : 'Diğer Oyuncu'; // Kazanan ismini belirleyin
      setWinner(calculatedWinner);
      setWinnerName(calculatedWinnerName);
      winSound.play();
    }

    if (socket) {
      socket.emit('move', {
        board: newBoard,
        isXNext: !isXNext,
        winner: calculatedWinner,
        winnerName: calculatedWinnerName,
      });
    }

    clickSound.play();
  };

  const handleRestart = () => {
    if (socket) {
      socket.emit('restart');
    }
  };

  const renderSquare = (index) => (
    <CSSTransition key={index} in={!!board[index]} timeout={300} classNames="square">
      <button className="square" onClick={() => handleClick(index)}>
        {board[index]}
      </button>
    </CSSTransition>
  );

  const joinRoom = () => {
    if (name && room && socket) {
      socket.emit('join', { name, room });
      setConnected(true);
    }
  };

  const status = winner ? (winner === 'Berabere' ? 'Berabere!' : `Kazanan: ${winnerName}`) : gameStarted ? `Sıradaki oyuncu: ${isXNext ? 'X' : 'O'}` : 'Diğer oyuncunun bağlanmasını bekleyin...';

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
          <button className="button" onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <div className="status">{status}</div>
          <div className="board">
            {[0, 1, 2].map(row => (
              <div key={row} className="board-row">
                {[0, 1, 2].map(col => renderSquare(row * 3 + col))}
              </div>
            ))}
          </div>
          {winner && (
            <button className="button" onClick={handleRestart}>Tekrar Oyna</button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
