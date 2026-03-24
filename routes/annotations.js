const express = require('express');
const router = express.Router();
const Annotation = require('../models/Annotation'); // 어제 만든 메모 설계도 불러오기

// 🎯 [POST] PDF 위에 메모/형광펜 남기기 API (주소: /api/annotations)
router.post('/', async (req, res) => {
  try {
    // 하민이가 프론트에서 쏴줄 좌표와 메모 데이터들
    const { roomId, userId, pageNum, annotationType, position, color, content } = req.body;

    // 새로운 메모 데이터 조립하기
    const newAnnotation = new Annotation({
      roomId,
      userId,
      pageNum,
      annotationType, // 'POSTIT'(포스트잇), 'HIGHLIGHT'(형광펜) 등
      position,       // { x: 150, y: 300 } 같은 마우스 좌표 값
      color,          // 방장한테 아까 부여했던 '#FFD700' 같은 색상
      content         // 포스트잇에 적은 글 내용 (형광펜이면 비어있을 수도 있음)
    });

    await newAnnotation.save(); // DB 금고에 저장!
    
    res.status(201).json({ 
      message: '메모 저장 성공!', 
      annotation: newAnnotation 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '메모 저장 중 에러가 발생했습니다.' });
  }
});

module.exports = router;