const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  // 👇 바로 이 부분! 비밀번호가 들어갈 칸을 설계도에 추가해 줘!!
  password: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  // 💡 추가됨: 이메일 찾기 및 본인 확인용 전화번호 (선택 입력)
  phone: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 💡 추가됨: 독서 MBTI (독서 성향 테스트 결과 저장용)
  readingMbti: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('User', UserSchema);