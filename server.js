const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // 몽구스 불러오기
const http = require('http'); // 👈 소켓 통신을 위한 Node 기본 HTTP 모듈
const { Server } = require('socket.io'); // 👈 실시간 통신 라이브러리 (Socket.io)
const path = require('path'); // 파일 경로 처리 모듈
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
// 👇 추가됨: 클라이언트(프론트엔드)에서 업로드된 사진을 볼 수 있도록 폴더 개방!
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 👇 여기가 몽고DB 연결하는 핵심 코드야!
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 연결 성공! 금고가 열렸습니다!'))
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

//회원가입 API
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// 👇 이메일 OTP 인증 API 창구 연결!
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

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

// 👇 추가됨: 1:1 다이렉트 메시지(DM) API 창구 연결!
const dmRoutes = require('./routes/dms');
app.use('/api/dms', dmRoutes);

app.get('/', (req, res) => {
  res.send('교환독서 백엔드 서버가 정상적으로 켜졌습니다! (Socket.io 탑재 완료) 🚀');
});

// 🎙️ [Socket.io] 실시간 방송국 세팅!
const Chat = require('./models/Chat'); // 채팅 DB 금고 불러오기

io.on('connection', (socket) => {
  console.log(`🔌 누군가 소켓 서버에 접속했습니다! (ID: ${socket.id})`);

  // 🆕 유저가 접속하면 자신의 userId로 개인 방 입장 (DM 수신용)
  socket.on('registerUser', (userId) => {
    socket.join(userId); // userId를 방 이름으로 개인 채널 생성
    console.log(`👤 유저 ${userId} 개인 채널 등록 완료`);
  });

  // 1. 유저가 특정 모임방 주파수(roomId)로 입장할 때
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`🙋‍♂️ 유저가 ${roomId} 방에 입장했습니다.`);
  });

  // 2. 유저가 채팅 메시지를 쏘아 올렸을 때
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, userId, message } = data;
      const newChat = new Chat({ roomId, userId, message });
      await newChat.save();
      const populatedChat = await Chat.findById(newChat._id).populate('userId', 'nickname');
      io.to(roomId).emit('receiveMessage', populatedChat);
    } catch (error) {
      console.error('소켓 메시지 전송 에러:', error);
    }
  });

  // 🆕 3. 1:1 DM 실시간 전송
  socket.on('sendDM', async (data) => {
    try {
      const DirectMessage = require('./models/DirectMessage');
      const { senderId, receiverId, content } = data;

      // DB에 저장
      const newDM = new DirectMessage({ senderId, receiverId, content });
      await newDM.save();

      const populatedDM = await DirectMessage.findById(newDM._id)
        .populate('senderId', 'nickname')
        .populate('receiverId', 'nickname');

      // 수신자 개인 채널로 실시간 전송
      io.to(receiverId).emit('receiveDM', populatedDM);
      // 발신자에게도 본인이 보낸 메시지 확인용으로 전송
      io.to(senderId).emit('receiveDM', populatedDM);

      console.log(`💌 DM: ${senderId} → ${receiverId}`);
    } catch (error) {
      console.error('DM 소켓 전송 에러:', error);
    }
  });

  // 4. 유저가 방을 나가거나 앱을 껐을 때
  socket.on('disconnect', () => {
    console.log('🔌 소켓 접속이 끊어졌습니다.');
  });
});

// 기존 app.listen 대신 server.listen으로 실행해야 소켓 통신이 같이 켜짐!
server.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다. (Socket.io 작동 중!)`);
});