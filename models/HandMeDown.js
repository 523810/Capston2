const mongoose = require('mongoose');

const handMeDownSchema = new mongoose.Schema({
  // 물려주는 사람 (방장 개념)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 어떤 책인지 간단 정보 (알라딘 API나 검색에서 얻은 정보 그대로 저장)
  bookTitle: {
    type: String,
    required: true
  },
  bookThumbnail: {
    type: String,
    default: ''
  },
  bookAuthor: {
    type: String,
    default: ''
  },
  // 프론트 기획: 책 품질보다 본인의 코멘트가 중요
  comment: {
    type: String,
    required: true
  },
  // 1:1 메시지 대신 연락할 수 있는 수단 (오픈카톡 링크 등)
  contactLink: {
    type: String,
    default: ''
  },
  // 거래 상태 (AVAILABLE: 대기중, COMPLETED: 나눔완료)
  status: {
    type: String,
    enum: ['AVAILABLE', 'COMPLETED'],
    default: 'AVAILABLE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HandMeDown', handMeDownSchema);
