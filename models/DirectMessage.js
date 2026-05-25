const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  // 보낸 사람
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 받는 사람
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 메시지 내용
  content: {
    type: String,
    required: true
  },
  // 읽음 여부 (안 읽은 메시지 표시용)
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DirectMessage', directMessageSchema);
