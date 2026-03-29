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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);