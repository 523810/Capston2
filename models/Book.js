const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  // 💡 카카오 검색 결과에 따라 추가된 필드들 👇
  isbn: {
    type: String,
    required: true,
    unique: true // 똑같은 책 중복 등록 방지
  },
  thumbnail: {
    type: String // 책 표지 이미지 주소
  },
  publisher: {
    type: String // 출판사
  },
  datetime: {
    type: Date // 출판일
  },
  contents: {
    type: String // 책 간단 줄거리
  },
  // 기존 필드 유지 (쪽수는 카카오에서 안 줄 수도 있으니 필수를 풀어둠)
  totalPages: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Book', bookSchema);