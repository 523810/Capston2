const express = require('express');
const router = express.Router();
const axios = require('axios'); // 👈 카카오 서버로 요청을 보낼 우체부 아저씨!
const Book = require('../models/Book');

// 🔍 [GET] 카카오 도서 검색 API (주소: /api/books/search?query=해리포터)
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query; // 주소창의 query 값을 뽑아옴

    if (!query) {
      return res.status(400).json({ message: '검색어를 입력해주세요!' });
    }

    // 💡 카카오 서버에 요청 보내기!
    const response = await axios.get('https://dapi.kakao.com/v3/search/book', {
      params: { query: query },
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
      }
    });

    // 검색 결과(10개)를 그대로 프론트로 던져줌
    res.status(200).json(response.data.documents);
  } catch (error) {
    console.error('카카오 도서 검색 에러:', error.message);
    res.status(500).json({ message: '책 검색 중 에러가 발생했습니다.' });
  }
});

// 🎯 1. [POST] 카카오에서 검색한 책을 서비스에 등록하기 API (주소: /api/books)
router.post('/', async (req, res) => {
  try {
    // 프론트에서 카카오 검색리스트 중 하나를 클릭해서 넘겨준 정보
    const { title, authors, isbn, thumbnail, publisher, datetime, contents } = req.body;

    // 카카오 작가 정보는 배열(authors)로 들어오므로 하나로 합치기
    const authorStr = authors && authors.length > 0 ? authors.join(', ') : '작자 미상';
    
    // 이미 DB에 있는 책인지 확인
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(200).json({ message: '이미 등록된 책입니다.', book: existingBook });
    }

    const newBook = new Book({
      title,
      author: authorStr,
      isbn,
      thumbnail,
      publisher,
      datetime,
      contents
    });

    await newBook.save(); // DB 금고에 저장
    res.status(201).json({ message: '새로운 책이 서비스에 등록되었습니다! 🎉', book: newBook });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '책 등록 중 에러가 발생했습니다.' });
  }
});

// 🎯 2. [GET] 등록된 모든 책 목록 불러오기 API (주소: /api/books)
router.get('/', async (req, res) => {
  try {
    const books = await Book.find(); // DB에 있는 책 다 가져와!
    res.status(200).json(books); // 프론트엔드로 전달
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '책 목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;