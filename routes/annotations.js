const express = require('express');
const router = express.Router();
const Annotation = require('../models/Annotation');

// 🎯 [POST] 책 위에 새 포스트잇/메모 붙이기
router.post('/', async (req, res) => {
  try {
    // 영우의 완벽한 설계도 필드명 그대로 받아오기!
    const { roomId, userId, pageNum, annotationType, position, color, content } = req.body;

    // 1. 새 메모 데이터 조립
    const newAnnotation = new Annotation({
      roomId,
      userId,
      pageNum,
      annotationType, // 'POSTIT', 'HIGHLIGHT', 'DRAWING' 중 하나!
      position,       // { x: 숫자, y: 숫자 } 형태!
      color,
      content
    });

    // 2. DB 금고에 찰싹! 붙이기
    await newAnnotation.save();

    res.status(201).json({
      message: '포스트잇이 책에 성공적으로 붙었습니다! 📌',
      annotation: newAnnotation
    });

  } catch (error) {
    console.error('메모 저장 에러:', error);
    res.status(500).json({ message: '메모 저장 중 에러가 발생했습니다.', error: error.message });
  }
});

// 🎯 [GET] 특정 방(roomId)에 붙어있는 모든 메모 구경하기 (프론트엔드 렌더링용)
router.get('/:roomId', async (req, res) => {
  try {
    const annotations = await Annotation.find({ roomId: req.params.roomId });
    res.status(200).json(annotations);
  } catch (error) {
    res.status(500).json({ message: '메모 목록 조회 실패' });
  }
});

module.exports = router;