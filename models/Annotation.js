const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pageNum: { type: Number, required: true }, // 몇 페이지에 있는 메모인지
  annotationType: { type: String, enum: ['POSTIT', 'HIGHLIGHT', 'DRAWING'], required: true },
  
  // 👇 프론트엔드가 PDF 위에 그려줄 위치 좌표
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  color: { type: String, required: true }, // 글쓴이의 고유 색상
  content: { type: String }, // 포스트잇 글귀 (그냥 밑줄 긋기면 비어있을 수도 있음)
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Annotation', annotationSchema);