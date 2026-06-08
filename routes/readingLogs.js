const express = require('express');
const router = express.Router();
const ReadingLog = require('../models/ReadingLog'); // 어제 만든 기록 설계도!
const auth = require('../middleware/auth'); // 문지기
const multer = require('multer');
const path = require('path');

// 📦 사진 파일 저장 설정 (이름 겹치지 않게 현재 시간 붙여서 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 🎯 [POST] 오늘의 독서 진행률 기록 API (주소: /api/reading-logs)
// (기존 코드와의 호환성을 위해 auth 미들웨어를 강제하지 않음)
router.post('/', upload.any(), async (req, res) => {
  try {
    // 프론트에서 쏴줄 데이터: "어떤 책을, 몇 페이지 읽었나?" + "별점, 감상, 공개여부"
    const { userId, bookId, readPage, readPages, date, status, rating, review, isPublic } = req.body;

    // 💡 여러 장의 사진 경로를 담을 바구니 준비
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    const finalImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';

    // 프론트가 날짜를 안 보냈을 경우 오늘 날짜 "YYYY-MM-DD" 로 직접 생성
    const today = new Date();
    const dateString = date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newLog = new ReadingLog({
      userId, 
      bookId,
      readPages: readPages || readPage || 0,
      date: dateString,
      status: status || '읽는 중',
      rating: rating || 0,
      review: review || '',
      imageUrl: finalImageUrl,
      images: imageUrls,
      isPublic: isPublic || false
    });

    await newLog.save(); // DB 금고에 저장!
    
    // 📢 만약 "내 피드에 공개하기(isPublic: true)"를 체크했고, 감상평(review)을 썼다면?
    // -> 필사 게시판(Annotation)에도 자동으로 글을 하나 올려준다!
    if (newLog.isPublic && newLog.review) {
      const Annotation = require('../models/Annotation');
      const newAnnotation = new Annotation({
        userId: newLog.userId,
        bookId: newLog.bookId,
        annotationType: 'QUOTE_TEXT',
        quote: newLog.review, // 감상평을 피드 내용으로!
        imageUrl: finalImageUrl,
        images: imageUrls,
      });
      await newAnnotation.save();
    }

    res.status(201).json({ 
      message: '독서 기록 저장 성공! (피드 공개 설정 시 게시판에도 올라갑니다)', 
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

// 📓 [GET] 나의 독서 노트 (코멘트/감상평 모아보기) API (주소: /api/reading-logs/my-notes)
router.get('/my-notes', auth, async (req, res) => {
  try {
    // 💡 프론트의 "나의 독서 노트 칸"을 위한 API!
    // 내 기록 중에서 감상평(review)을 한 글자라도 쓴 것만 찾아오기
    const notes = await ReadingLog.find({ 
      userId: req.user.id,
      review: { $ne: '' } // 비어있지 않은 것만! (비공개로 쓴 것도 내가 보는 내 노트니까 전부 가져옵니다)
    })
    .populate('bookId', 'title author thumbnail') // 어떤 책인지 정보 붙이기
    .sort({ createdAt: -1, date: -1 }); // 최신순 정렬

    // 💡 하민님이 프론트 수정 안 하셔도 되도록 백엔드에서 특별 배려!
    // DB의 thumbnail 값을 프론트가 쓰는 cover라는 이름으로 하나 더 복사해서 줍니다.
    const formattedNotes = notes.map(note => {
      const noteObj = note.toObject(); // Mongoose 객체를 순수 JSON으로 변환
      if (noteObj.bookId && noteObj.bookId.thumbnail) {
        noteObj.bookId.cover = noteObj.bookId.thumbnail; // cover 속성 추가!
      }
      return noteObj;
    });

    res.status(200).json(formattedNotes);
  } catch (error) {
    console.error('독서 노트 불러오기 에러:', error);
    res.status(500).json({ message: '독서 노트를 불러오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;