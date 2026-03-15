const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // 몽구스 불러오기
require('dotenv').config();

const app = express();
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

app.get('/', (req, res) => {
  res.send('교환독서 백엔드 서버가 정상적으로 켜졌습니다! 🚀');
});

app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});