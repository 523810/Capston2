const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true // 이메일은 중복 가입 안 되게 막기!
  },
  nickname: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now // 가입하면 현재 시간 자동으로 찍힘
  }
});

module.exports = mongoose.model('User', userSchema);