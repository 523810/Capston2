const express = require('express');
const router = express.Router();
const Annotation = require('../models/Annotation');
const Book = require('../models/Book');
const auth = require('../middleware/auth'); // 👈 문지기 미들웨어 불러오기

// 🧑‍💻 [GET] 내 문장 수집함: 내가 쓴 피드만 모아보기 (마이페이지용)
// ⚠️ 반드시 다른 :roomId 라우터보다 위에 있어야 'my'를 아이디로 착각하지 않음!
router.get('/my', auth, async (req, res) => {
  try {
    // auth 미들웨어를 통과했으므로 req.user.id 에 내 아이디가 들어있음
    const myAnnotations = await Annotation.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('bookId', 'title thumbnail') // 책 정보도 같이 가져옴
      .populate('userId', 'nickname');

    res.status(200).json(myAnnotations);
  } catch (error) {
    console.error('내 문장 불러오기 에러:', error);
    res.status(500).json({ message: '내 문장 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 🎯 [POST] 책 피드(게시판)에 새 글/사진 남기기
router.post('/', async (req, res) => {
  try {
    const { roomId, userId, bookId, annotationType, quote, imageUrl, color } = req.body;

    // 1. 새 피드 데이터 조립
    const newAnnotation = new Annotation({
      roomId,
      userId,
      bookId, // 피드를 올릴 때 랭킹 점수를 위해 책 ID 필수!
      annotationType, // 'QUOTE_TEXT' 또는 'PHOTO_MEMO'
      quote,
      imageUrl,
      color
    });

    // 2. DB 금고에 저장
    await newAnnotation.save();

    // 3. ⭐️ 글이 올라갔으니 해당 책의 랭킹(클릭수) 점수도 1점 팍 올려주기! (인기도 반영)
    if (bookId) {
      await Book.findByIdAndUpdate(bookId, { $inc: { clickCount: 1 } });
    }

    res.status(201).json({
      message: '텍스트힙 전시회에 기록이 성공적으로 추가되었습니다! ✍️',
      annotation: newAnnotation
    });

  } catch (error) {
    console.error('피드 저장 에러:', error);
    res.status(500).json({ message: '기록 저장 중 에러가 발생했습니다.', error: error.message });
  }
});

// 🖼️ [GET] 필사 전시회: 전체 모임방 최신 멋진 글귀 10개 구경하기 (앱 홈 화면용)
router.get('/exhibition', async (req, res) => {
  try {
    // 가장 최근에 올라온 순(내림차순, -1)으로 10개만 뽑기!
    const annotations = await Annotation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('bookId', 'title thumbnail') // 보여줄 때 무슨 책인지 제목과 표지도 같이 보내줌
      .populate('userId', 'nickname');       // 누가 썼는지 닉네임도 같이 보내줌

    res.status(200).json(annotations);
  } catch (error) {
    console.error('필사 전시회 에러:', error);
    res.status(500).json({ message: '전시회 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 📖 [GET] 특정 모임방(roomId)에 올라온 피드 목록 쭈욱 구경하기 (모임방 내부 게시판용)
router.get('/:roomId', async (req, res) => {
  try {
    // 방 안에서는 옛날 글부터 최근 글로 보여줄 수도 있고, 최근 글부터 보여줄 수도 있음 (여기선 최근 글 먼저)
    const annotations = await Annotation.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .populate('userId', 'nickname');

    res.status(200).json(annotations);
  } catch (error) {
    res.status(500).json({ message: '모임방 피드 목록 조회 실패' });
  }
});

module.exports = router;