require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound')
.then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Socket.IO chat functionality
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('set user', (userId) => {
    socket.user_id = userId;
  });

  socket.on('join room', (data) => {
    socket.join(data.itemId);
  });

  socket.on('leave room', (itemId) => {
    socket.leave(itemId);
  });

socket.on('chat message', (data) => {
    const {itemId, msg, senderId, ownerId} = data;
    io.to(itemId).emit('chat message', {msg});
    if (senderId !== ownerId) {
      // notify owner
      const sockets = io.sockets.sockets;
      for (let s of sockets.values()) {
        if (s.user_id === ownerId) {
          s.emit('notification', {itemId, msg});
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
