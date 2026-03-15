const mongoose = require('mongoose');

const readingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  date: { type: String, required: true }, // "2026-03-13" 처럼 날짜 글자로 저장 (그래프 그리기 편함)
  readPages: { type: Number, default: 0 } // 그날 몇 쪽 읽었는지
});

module.exports = mongoose.model('ReadingLog', readingLogSchema);