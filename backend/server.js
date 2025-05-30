     const express = require('express');
     const http = require('http');
     const { Server } = require('socket.io');

     const app = express();
     const server = http.createServer(app);
     const io = new Server(server, {
       cors: {
         origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow both possible frontend ports
         methods: ['GET', 'POST'],
       },
     });

     const rooms = {};

     io.on('connection', (socket) => {
       console.log('User connected:', socket.id);

       socket.on('join-room', (roomId) => {
         socket.join(roomId);
         if (!rooms[roomId]) {
           rooms[roomId] = new Set();
         }
         rooms[roomId].add(socket.id);
         socket.to(roomId).emit('user-joined', socket.id);
         console.log(`User ${socket.id} joined room ${roomId}`);
       });

       socket.on('offer', ({ offer, to, roomId }) => {
         socket.to(to).emit('offer', { offer, from: socket.id });
       });

       socket.on('answer', ({ answer, to, roomId }) => {
         socket.to(to).emit('answer', { answer, from: socket.id });
       });

       socket.on('ice-candidate', ({ candidate, to, roomId }) => {
         socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
       });

       socket.on('chat-message', ({ username, message, roomId }) => {
         io.to(roomId).emit('chat-message', { username, message });
       });

       socket.on('disconnect', () => {
         console.log('User disconnected:', socket.id);
         for (const roomId in rooms) {
           if (rooms[roomId].has(socket.id)) {
             rooms[roomId].delete(socket.id);
             socket.to(roomId).emit('user-disconnected', socket.id);
             if (rooms[roomId].size === 0) {
               delete rooms[roomId];
             }
           }
         }
       });
     });

     server.listen(4000, () => {
       console.log('Server running on http://localhost:4000');
     });
     