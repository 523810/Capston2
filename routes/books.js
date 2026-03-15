const express = require('express');
const router = express.Router(); // 대문자 R 주의! 😉
const Book = require('../models/Book');

// 🎯 1. [POST] 새로운 책 등록하기 API (주소: /api/books)
router.post('/', async (req, res) => {
  try {
    const { title, author, totalPages, pdfFileUrl } = req.body;

    const newBook = new Book({
      title,
      author,
      totalPages,
      pdfFileUrl
    });

    await newBook.save(); // DB에 저장
    res.status(201).json({ message: '책 등록 성공!', book: newBook });
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