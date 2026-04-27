const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // 어느 책에 대한 피드인지 참조 (랭킹을 위해 필수)
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  
  annotationType: { type: String, enum: ['QUOTE_TEXT', 'PHOTO_MEMO'], required: true },
  
  // 피드 본문 (인상깊은 문장)
  quote: { type: String, required: true },
  
  // 사진 첨부 (선택)
  imageUrl: { type: String },
  
  // 피드 작성자의 고유 메모 색상 등 UI용 필드 유지
  color: { type: String, default: '#FFFFFF' }, 
  
  // 좋아요(스크랩) 한 유저들의 ID 목록 (누가 이 글을 좋아했는지 기억)
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Annotation', annotationSchema);