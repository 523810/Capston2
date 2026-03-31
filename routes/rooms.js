const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// 🎯 [POST] 새 교환독서 모임방 만들기 (비밀번호 필수!)
router.post('/', async (req, res) => {
  try {
    // 💡 프론트에서 방 비밀번호(roomPassword)까지 싹 받아오기 (bookId는 일단 없음!)
    const { roomType, roomName, roomPassword, hostId, maxMembers } = req.body;

    // 1. 새로운 방 데이터 조립!
    const newRoom = new Room({
      roomType,
      roomName,
      roomPassword, // 👈 쉿! 비밀방 암호 저장
      hostId,
      members: [{ userId: hostId }], // 방장은 멤버 명단에 1빠로 등록!
      maxMembers: maxMembers || 4
    });

    // 2. DB 금고에 저장!
    await newRoom.save();

    // 3. 성공 응답 쏴주기
    res.status(201).json({
      message: '비밀번호가 걸린 새로운 독서 모임방이 성공적으로 개설되었습니다! 🤫',
      room: newRoom
    });

  } catch (error) {
    console.error('방 개설 에러:', error);
    res.status(500).json({ message: '모임방 개설 중 에러가 발생했습니다.', error: error.message });
  }
});

// 🎯 [GET] 만들어진 모든 방 구경하기 (테스트용)
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: '방 목록 조회 실패' });
  }
});

module.exports = router;