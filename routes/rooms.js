const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// 🎯 [POST] 새 교환독서 모임방 만들기
router.post('/', async (req, res) => {
  try {
    // 💡 영우의 설계도(Room.js) 필드명에 완벽하게 맞춤!
    const { roomType, roomName, bookId, hostId, maxMembers } = req.body;

    // 1. 새로운 방 데이터 조립!
    const newRoom = new Room({
      roomType,        // 예: "PUBLIC" 또는 "PRIVATE"
      roomName,        // 예: "모순 같이 읽을 사람 구해요!"
      bookId,          // 교환할 책의 ID
      hostId,          // 방장 유저 ID
      // 💡 members는 설계도상 객체 배열일 확률이 높음! (예: [{ userId: hostId }])
      members: [{ userId: hostId }], 
      maxMembers: maxMembers || 4
    });

    // 2. DB 금고에 저장!
    await newRoom.save();

    res.status(201).json({
      message: '새로운 독서 모임방이 성공적으로 개설되었습니다! 🎉',
      room: newRoom
    });

  } catch (error) {
    console.error('방 개설 에러:', error);
    res.status(500).json({ message: '모임방 개설 중 에러가 발생했습니다.', error: error.message });
  }
});

// 🎯 [GET] 만들어진 모든 방 구경하기
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: '방 목록 조회 실패' });
  }
});

module.exports = router;