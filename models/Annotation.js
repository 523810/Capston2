const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  // 방 번호 (데모 시연을 위해 임시로 필수 해제 - 하민님이 프론트에서 안 보내주고 계심!)
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // 어느 책에 대한 피드인지 참조 (데모 시연을 위해 임시로 필수 해제!)
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: false },
  
  // 타입도 임시로 필수 해제
  annotationType: { type: String, enum: ['QUOTE_TEXT', 'PHOTO_MEMO'], required: false, default: 'QUOTE_TEXT' },
  
  // 피드 본문 (인상깊은 문장) - 팀장님 피드백 반영: 글 내용은 무조건 있어야 하므로 다시 필수!
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