const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomType: { 
    type: String, 
    enum: ['LOCAL', 'ONLINE'], 
    required: true 
  },
  roomName: { 
    type: String, 
    required: true 
  },
  // 💡 추가됨: 방 입장용 비밀번호 (또는 초대 코드)
  roomPassword: { 
    type: String, 
    required: true 
  },
  // 💡 수정됨: 방을 먼저 만들고 책은 나중에 넣으므로 required: true 삭제!
  bookId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book' 
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  members: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
  }],
  maxMembers: { 
    type: Number, 
    default: 4 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Room', roomSchema);