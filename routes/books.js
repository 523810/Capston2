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

// 🏆 [GET] 도서 랭킹 조회 API (클릭수 기준 상위 5개)
router.get('/ranking', async (req, res) => {
  try {
    // clickCount 내림차순(-1) 정렬하여 5개만 가져오기
    const books = await Book.find().sort({ clickCount: -1 }).limit(5);
    res.status(200).json(books);
  } catch (error) {
    console.error('도서 랭킹 조회 에러:', error);
    res.status(500).json({ message: '순위 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 👆 [PUT] 도서 클릭(조회수) 증가 API (주소: /api/books/:id/click)
router.put('/:id/click', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: '책을 찾을 수 없습니다.' });

    book.clickCount += 1;
    await book.save();
    res.status(200).json({ message: '도서 조회수가 증가했습니다.', clickCount: book.clickCount });
  } catch (error) {
    res.status(500).json({ message: '조회수 증가 처리 중 에러가 발생했습니다.' });
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

// 🌟 [GET] 알라딘 API 연동: 장르별 베스트셀러 순위 (1~10위)
router.get('/public-ranking', async (req, res) => {
  try {
    const { genre } = req.query; // 프론트에서 ?genre=소설 형태로 보냄
    
    // 알라딘 카테고리 ID 매핑 (빈 값이면 0: 종합 베스트셀러)
    let categoryId = 0; 
    if (genre === '소설') categoryId = 1;
    else if (genre === '에세이') categoryId = 55889;
    else if (genre === '경제경영') categoryId = 170;
    else if (genre === '자기계발') categoryId = 336;
    else if (genre === '인문') categoryId = 656;

    // 팀장님이 발급받으신 TTBKey (보안을 위해 .env에서 불러오기!)
    const ALADIN_TTB_KEY = process.env.ALADIN_TTB_KEY; 

    // 알라딘 서버에 "베스트셀러 10개만 JS(JSON) 형식으로 줘!" 라고 요청
    const response = await axios.get('http://www.aladin.co.kr/ttb/api/ItemList.aspx', {
      params: {
        ttbkey: ALADIN_TTB_KEY,
        QueryType: 'Bestseller',
        MaxResults: 10,  // 딱 10위까지만
        start: 1,
        SearchTarget: 'Book',
        output: 'js',    // 응답을 json 형태로 받음
        Version: 20131101,
        CategoryId: categoryId
      }
    });

    // 만약 데이터가 없으면 빈 배열 던짐
    if (!response.data || !response.data.item) {
      return res.status(200).json([]);
    }

    // 하민님(프론트)이 화면에 쓰기 편하게 데이터 모양을 예쁘게 다듬어서 보내기
    const books = response.data.item.map((book, index) => ({
      rank: index + 1,          // 1위, 2위...
      title: book.title,        // 책 제목
      author: book.author,      // 작가
      thumbnail: book.cover,    // 표지 이미지 URL
      publisher: book.publisher,// 출판사
      isbn: book.isbn13 || book.isbn, // ISBN (나중에 우리 DB 저장용)
      link: book.link           // 알라딘 상품 페이지 링크
    }));

    res.status(200).json(books);
  } catch (error) {
    console.error('알라딘 랭킹 API 에러:', error);
    res.status(500).json({ message: '순위 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;