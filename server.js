const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // 몽구스 불러오기
const http = require('http'); // 👈 소켓 통신을 위한 Node 기본 HTTP 모듈
const { Server } = require('socket.io'); // 👈 실시간 통신 라이브러리 (Socket.io)
require('dotenv').config();

const app = express();
// Express 앱을 http 서버로 한 겹 감싸주기 (소켓 엔진을 달기 위해!)
const server = http.createServer(app);

// 소켓 서버 설정 (CORS 문제 없게 프론트엔드 접속 다 열어주기)
const io = new Server(server, {
  cors: {
    origin: '*', // 실전에서는 허용할 프론트엔드 주소만 넣어야 하지만 일단 캡스톤용이라 전부 열어둠
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 👇 여기가 몽고DB 연결하는 핵심 코드야!
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 연결 성공! 금고가 열렸습니다!'))
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

//회원가입 API
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// 👇 방금 만든 책 API 창구 연결!
const bookRoutes = require('./routes/books');
app.use('/api/books', bookRoutes);

// 👇 방금 만든 모임방 API 창구 연결!
const roomRoutes = require('./routes/rooms');
app.use('/api/rooms', roomRoutes);

// 👇 방금 만든 메모(Annotation) API 창구 연결!
const annotationRoutes = require('./routes/annotations');
app.use('/api/annotations', annotationRoutes);

// 👇 대망의 마지막! 독서 기록(Reading Log) API 창구 연결!
const readingLogRoutes = require('./routes/readingLogs');
app.use('/api/reading-logs', readingLogRoutes);

// 👇 추가됨: 책 물려주기(HandMeDown) API 창구 연결!
const handMeDownRoutes = require('./routes/handmedowns');
app.use('/api/handmedowns', handMeDownRoutes);

// 👇 추가됨: 과거 채팅 내역 불러오기 API 창구 연결!
const chatRoutes = require('./routes/chats');
app.use('/api/chats', chatRoutes);

app.get('/', (req, res) => {
  res.send('교환독서 백엔드 서버가 정상적으로 켜졌습니다! (Socket.io 탑재 완료) 🚀');
});

// 🎙️ [Socket.io] 실시간 방송국 세팅!
const Chat = require('./models/Chat'); // 채팅 DB 금고 불러오기

io.on('connection', (socket) => {
  console.log(`🔌 누군가 소켓 서버에 접속했습니다! (ID: ${socket.id})`);

  // 1. 유저가 특정 모임방 주파수(roomId)로 입장할 때
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId); // 해당 방 번호의 소켓 채널로 입장
    console.log(`🙋‍♂️ 유저가 ${roomId} 방에 입장했습니다.`);
  });

  // 2. 유저가 채팅 메시지를 쏘아 올렸을 때
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, userId, message } = data;

      // 먼저 DB 금고에 채팅 기록 안전하게 저장
      const newChat = new Chat({ roomId, userId, message });
      await newChat.save();

      // 저장한 채팅 기록을 작성자 닉네임과 함께 다시 묶어서(Populate 느낌) 방 안의 모두에게 방송(emit)
      const populatedChat = await Chat.findById(newChat._id).populate('userId', 'nickname');

      // 같은 방(roomId)에 있는 모든 사람에게 'receiveMessage' 라는 이름으로 데이터 쏴주기
      io.to(roomId).emit('receiveMessage', populatedChat);
    } catch (error) {
      console.error('소켓 메시지 전송 에러:', error);
    }
  });

  // 3. 유저가 방을 나가거나 앱을 껐을 때
  socket.on('disconnect', () => {
    console.log('🔌 소켓 접속이 끊어졌습니다.');
  });
});

// 기존 app.listen 대신 server.listen으로 실행해야 소켓 통신이 같이 켜짐!
server.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다. (Socket.io 작동 중!)`);
});