const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  bookId: { 
    type: mongoose.Schema.Types.ObjectId, // 다른 파일(Book)의 ID를 연결(참조)하는 방식이야
    ref: 'Book', 
    required: true 
  },
  roomName: { type: String, required: true },
  roomType: { type: String, enum: ['LOCAL', 'ONLINE'], required: true }, // 지인방 vs 공개방
  maxMembers: { type: Number, default: 10 },
  
  // 👇 여기가 핵심! 방에 들어온 사람들의 정보를 배열(리스트)로 묶어둠
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedColor: { type: String }, // 이 방에서 쓸 내 고유 색상
    currentPage: { type: Number, default: 1 }, // 이어보기용 (마지막 읽은 페이지)
    bookmarks: [{ type: Number }] // 책갈피 꽂은 페이지 번호들
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);