const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// 🎯 [POST] 새로운 교환독서 방 만들기 API (주소: /api/rooms)
router.post('/', async (req, res) => {
  try {
    // 하민이가 프론트에서 쏴줄 데이터들
    const { bookId, roomName, roomType, maxMembers, creatorId } = req.body;

    // 방장(방 만든 사람)에게 부여할 첫 번째 형광펜 색상 (예: 노란색)
    const firstColor = "#FFD700"; 

    // 새로운 방 뼈대 조립하기
    const newRoom = new Room({
      bookId,
      roomName,
      roomType,
      maxMembers: maxMembers || 10, // 안 보내면 기본값 10명
      members: [
        {
          userId: creatorId,         // 방장 ID
          assignedColor: firstColor, // 방장 전용 색상 획득!
          currentPage: 1,            // 첫 페이지부터 시작
          bookmarks: []
        }
      ]
    });

    await newRoom.save(); // DB 금고에 저장!
    
    res.status(201).json({ 
      message: '모임방 생성 성공!', 
      room: newRoom 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '모임방 생성 중 에러가 발생했습니다.' });
  }
});

module.exports = router;