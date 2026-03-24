const express = require('express');
const router = express.Router();
const ReadingLog = require('../models/ReadingLog'); // 어제 만든 기록 설계도!

// 🎯 [POST] 오늘의 독서 진행률 기록 API (주소: /api/reading-logs)
router.post('/', async (req, res) => {
  try {
    // 프론트에서 쏴줄 데이터: "누가, 어떤 책을, 몇 페이지까지 읽었나?"
    const { userId, bookId, readPage } = req.body;

    const newLog = new ReadingLog({
      userId,
      bookId,
      readPage,
      date: new Date() // 서버가 알아서 오늘 날짜와 시간을 딱 박아줌!
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

module.exports = router;