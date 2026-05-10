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
    enum: ['READING', 'EXCHANGE', 'HANDMEDOWN'],
    default: 'READING'
  },
  roomName: {
    type: String,
    required: true
  },
  // 💡 추가됨: 프론트엔드 요청에 따른 모임방 소개글(description)
  description: {
    type: String,
    default: '' // 소개글이 필수가 아닐 수도 있으니 기본값은 빈 문자열
  },
  // 💡 추가됨: 방 입장용 비밀번호 (또는 초대 코드)
  // 💡 수정됨: 프론트엔드 기획(공개방/비밀방)에 맞춰 비밀번호 필수를 해제함!
  roomPassword: {
    type: String,
    required: false
  },
  // 💡 추가됨: 프론트엔드 화면의 '기존 모임 참여하기' 모달에 쓰일 6자리 자동 발급 코드
  inviteCode: {
    type: String,
    unique: true,
    sparse: true // null 이나 undefined 인 경우 중복 검사를 통과하게 해줌 (옛날에 만든 방들 에러 방지)
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