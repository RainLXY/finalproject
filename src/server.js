const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 连接 MongoDB
mongoose.connect('mongodb://localhost:27017/sound-palette', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// 中间件
app.use(express.json());
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use(express.static('src/public'));

// 路由
app.use('/auth', authRoutes);

// 根路径路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/views/index.html');
});

// Socket.IO 事件处理
io.on('connection', (socket) => {
    console.log('New client connected');
    // 这里可以添加 Socket.IO 事件处理逻辑
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
