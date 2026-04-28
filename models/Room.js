const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomType: { 
    type: String, 
    enum: ['LOCAL', 'ONLINE'], 
    required: true 
  },
  // 💡 추가됨: 모임방인지 교환방인지 구분하는 카테고리 (하민님 요청 반영)
  category: {
    type: String,
    enum: ['READING', 'EXCHANGE'],
    default: 'READING'
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
  // 💡 추가됨: 프론트엔드 화면의 '기존 모임 참여하기' 모달에 쓰일 6자리 자동 발급 코드
  inviteCode: {
    type: String,
    required: true,
    unique: true
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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    // 💡 이거 한 줄 추가! (기본값은 0페이지)
    readPages: { type: Number, default: 0 }
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