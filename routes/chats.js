const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../middleware/auth'); // 문지기

// 📖 [GET] 특정 모임방의 과거 대화 기록 쫙 불러오기 (주소: /api/chats/:roomId)
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    // 해당 방에서 오간 채팅들을 보낸 시간 순서대로 정렬해서 가져오기
    // 누가 보냈는지 닉네임과 프로필 사진(있다면)도 같이 묶어서 보내줌
    const chats = await Chat.find({ roomId })
      .sort({ createdAt: 1 }) // 과거 글부터 차례대로 보여줘야 하니까 오름차순(1)
      .populate('userId', 'nickname'); 

    res.status(200).json(chats);
  } catch (error) {
    console.error('채팅 내역 불러오기 에러:', error);
    res.status(500).json({ message: '채팅 기록을 불러오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;
