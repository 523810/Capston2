const mongoose = require('mongoose');

const readingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: false }, // 💡 책 선택 없이도 기록 가능
  date: { type: String, required: true }, // "2026-03-13" 처럼 날짜 글자로 저장 (그래프 그리기 편함)
  readPages: { type: Number, default: 0 }, // 그날 몇 쪽 읽었는지
  
  // 🆕 화면 UI에 맞춰 새로 추가된 항목들!
  status: { type: String, default: '읽는 중' }, // 독서 상태 (예: 읽는 중, 다 읽음 등)
  rating: { type: Number, default: 0 }, // 나의 별점 (1~5)
  review: { type: String, default: '' }, // 나의 감상
  isPublic: { type: Boolean, default: false } // 내 피드에 공개하기 여부
});

module.exports = mongoose.model('ReadingLog', readingLogSchema);