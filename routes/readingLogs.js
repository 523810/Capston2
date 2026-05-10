const express = require('express');
const router = express.Router();
const ReadingLog = require('../models/ReadingLog'); // 어제 만든 기록 설계도!
const auth = require('../middleware/auth'); // 문지기

// 🎯 [POST] 오늘의 독서 진행률 기록 API (주소: /api/reading-logs)
router.post('/', auth, async (req, res) => {
  try {
    // 프론트에서 쏴줄 데이터: "어떤 책을, 몇 페이지 읽었나?"
    const { bookId, readPages, date } = req.body;

    const today = new Date();
    const dateString = date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newLog = new ReadingLog({
      userId: req.user.id,
      bookId,
      readPages,
      date: dateString // "2026-05-10" 형식으로 저장
    });

    await newLog.save(); // DB 금고에 저장!
    
    res.status(201).json({ 
      message: '독서 기록 저장 성공! 그래프 쑥쑥 올라간다!', 
      readingLog: newLog 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '독서 기록 저장 중 에러가 발생했습니다.' });
  }
});

// 🧾 [GET] 독서 영수증 API (주소: /api/reading-logs/receipt?year=2026&month=05)
router.get('/receipt', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ message: 'year와 month를 쿼리로 보내주세요.' });

    // 예: "2026-05" 로 시작하는 날짜 데이터 찾기
    const prefix = `${year}-${month.padStart(2, '0')}`;
    const logs = await ReadingLog.find({ 
      userId: req.user.id, 
      date: { $regex: `^${prefix}` } 
    }).populate('bookId', 'title author');

    let totalPages = 0;
    const booksMap = {}; // 책별로 합산하기 위한 임시 저장소

    logs.forEach(log => {
      totalPages += log.readPages;
      const bookKey = log.bookId._id.toString();
      if (!booksMap[bookKey]) {
        booksMap[bookKey] = {
          title: log.bookId.title,
          author: log.bookId.author,
          totalReadPages: 0
        };
      }
      booksMap[bookKey].totalReadPages += log.readPages;
    });

    const receiptBooks = Object.values(booksMap);

    res.status(200).json({
      receiptDate: `${year}년 ${month}월`,
      totalReadBooks: receiptBooks.length,
      totalReadPages: totalPages,
      books: receiptBooks
    });

  } catch (error) {
    console.error('독서 영수증 에러:', error);
    res.status(500).json({ message: '영수증 데이터를 불러오는 중 에러가 발생했습니다.' });
  }
});

// 📊 [GET] 독서 통계 대시보드 API (주소: /api/reading-logs/stats)
router.get('/stats', auth, async (req, res) => {
  try {
    const logs = await ReadingLog.find({ userId: req.user.id });

    // 월별 총 독서량 집계
    const monthlyStats = {};
    logs.forEach(log => {
      // date가 "2026-05-10" 형식이므로 앞의 7자리 "2026-05"만 추출
      const monthKey = log.date.substring(0, 7); 
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = 0;
      }
      monthlyStats[monthKey] += log.readPages;
    });

    res.status(200).json({
      monthlyStats // 예: { "2026-04": 150, "2026-05": 320 }
    });
  } catch (error) {
    console.error('독서 통계 에러:', error);
    res.status(500).json({ message: '통계 데이터를 불러오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;