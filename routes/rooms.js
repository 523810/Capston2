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

// 🎯 [POST] 비밀방 입장하기 (주소: /api/rooms/:roomId/join)
router.post('/:roomId/join', async (req, res) => {
  try {
    // 1. 주소에서 방 아이디, 바디에서 비밀번호랑 유저 아이디 가져오기
    const { roomId } = req.params;
    const { roomPassword, userId } = req.body;

    // 2. 문지기 검사 1: "그 방이 진짜 있나요?"
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '존재하지 않는 방입니다.' });
    }

    // 3. 문지기 검사 2: "비밀번호가 맞나요?" (기획 미정이지만 일단 검사 로직은 준비!)
    if (room.roomPassword && room.roomPassword !== roomPassword) {
      return res.status(403).json({ message: '비밀번호가 틀렸습니다. ❌' });
    }

    // 4. 문지기 검사 3: "이미 들어온 사람 아닌가요?"
    const isAlreadyMember = room.members.some(member => member.userId.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).json({ message: '이미 참여 중인 방입니다. 🙋‍♂️' });
    }

    // 5. 모든 검사 통과! 명단에 이름 적어주기 📝
    room.members.push({ userId });
    
    // 6. 변경된 명단 DB에 최종 저장!
    await room.save();

    res.status(200).json({
      message: '방 입장에 성공했습니다! 환영합니다! 🎉',
      room: room // 업데이트된 방 정보 통째로 던져주기
    });

  } catch (error) {
    console.error('방 입장 에러:', error);
    res.status(500).json({ message: '방 입장 처리 중 에러가 발생했습니다.' });
  }
});

module.exports = router;