const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 📬 [GET] 내 DM 대화 목록 (누구와 대화했는지 목록) (주소: /api/dms)
router.get('/', auth, async (req, res) => {
  try {
    const myId = req.user.id;

    // 내가 보냈거나 받은 모든 DM에서 상대방 ID 목록 추출
    const messages = await DirectMessage.find({
      $or: [{ senderId: myId }, { receiverId: myId }]
    }).sort({ createdAt: -1 });

    // 대화 상대 목록 (중복 제거)
    const partnerIds = new Set();
    messages.forEach(msg => {
      const partnerId = msg.senderId.toString() === myId
        ? msg.receiverId.toString()
        : msg.senderId.toString();
      partnerIds.add(partnerId);
    });

    // 각 대화 상대의 정보 + 마지막 메시지 + 안읽은 메시지 수
    const conversations = await Promise.all(
      [...partnerIds].map(async (partnerId) => {
        const partner = await User.findById(partnerId).select('nickname readingMbti');
        const lastMessage = await DirectMessage.findOne({
          $or: [
            { senderId: myId, receiverId: partnerId },
            { senderId: partnerId, receiverId: myId }
          ]
        }).sort({ createdAt: -1 });

        const unreadCount = await DirectMessage.countDocuments({
          senderId: partnerId,
          receiverId: myId,
          isRead: false
        });

        return {
          partner,
          lastMessage,
          unreadCount
        };
      })
    );

    res.status(200).json(conversations);
  } catch (error) {
    console.error('DM 대화 목록 에러:', error);
    res.status(500).json({ message: 'DM 목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

// 👥 [GET] 내 친구 목록 (팔로우한 사람들) (주소: /api/dms/friends)
router.get('/friends', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .populate('following', 'nickname email readingMbti')
      .populate('followers', 'nickname email readingMbti');

    if (!me) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

    // 맞팔로우 (서로 팔로우한 사람 = 진짜 친구)
    const followingIds = me.following.map(u => u._id.toString());
    const mutualFriends = me.followers.filter(u => followingIds.includes(u._id.toString()));

    res.status(200).json({
      following: me.following,       // 내가 팔로우하는 사람들
      followers: me.followers,       // 나를 팔로우하는 사람들
      mutualFriends                  // 맞팔 (진짜 친구)
    });
  } catch (error) {
    console.error('친구 목록 에러:', error);
    res.status(500).json({ message: '친구 목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

// 💬 [GET] 특정 유저와의 대화 내역 (주소: /api/dms/:targetUserId)
router.get('/:targetUserId', auth, async (req, res) => {
  try {
    const myId = req.user.id;
    const { targetUserId } = req.params;

    // 나와 상대방 사이의 모든 메시지 가져오기 (시간순)
    const messages = await DirectMessage.find({
      $or: [
        { senderId: myId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: myId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'nickname')
      .populate('receiverId', 'nickname');

    // 상대방이 보낸 메시지 읽음 처리
    await DirectMessage.updateMany(
      { senderId: targetUserId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('DM 대화 내역 에러:', error);
    res.status(500).json({ message: '대화 내역을 불러오는 중 에러가 발생했습니다.' });
  }
});

// 📨 [POST] 메시지 보내기 (주소: /api/dms/:targetUserId)
router.post('/:targetUserId', auth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { targetUserId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '메시지 내용을 입력해주세요!' });
    }

    // 상대방이 존재하는지 확인
    const receiver = await User.findById(targetUserId);
    if (!receiver) {
      return res.status(404).json({ message: '상대방을 찾을 수 없습니다.' });
    }

    const newMessage = new DirectMessage({
      senderId,
      receiverId: targetUserId,
      content: content.trim()
    });

    await newMessage.save();

    const populatedMessage = await DirectMessage.findById(newMessage._id)
      .populate('senderId', 'nickname')
      .populate('receiverId', 'nickname');

    res.status(201).json({
      message: '메시지를 보냈습니다! 💌',
      dm: populatedMessage
    });
  } catch (error) {
    console.error('DM 전송 에러:', error);
    res.status(500).json({ message: '메시지 전송 중 에러가 발생했습니다.' });
  }
});

module.exports = router;
