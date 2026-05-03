const express = require('express');
const router = express.Router();
const HandMeDown = require('../models/HandMeDown');
const auth = require('../middleware/auth'); // 문지기

// 🎯 [POST] 물려주기 게시판에 새 글 올리기 (주소: /api/handmedowns)
router.post('/', auth, async (req, res) => {
  try {
    const { bookTitle, bookThumbnail, bookAuthor, comment, contactLink } = req.body;

    const newPost = new HandMeDown({
      ownerId: req.user.id, // 토큰에서 자동 추출
      bookTitle,
      bookThumbnail,
      bookAuthor,
      comment,
      contactLink
    });

    await newPost.save();
    
    res.status(201).json({
      message: '물려주기 게시글이 성공적으로 등록되었습니다! 🎁',
      post: newPost
    });
  } catch (error) {
    console.error('물려주기 글 등록 에러:', error);
    res.status(500).json({ message: '게시글 등록 중 에러가 발생했습니다.' });
  }
});

// 📖 [GET] 물려주기 게시판 전체 목록 보기 (주소: /api/handmedowns)
router.get('/', async (req, res) => {
  try {
    // 최신 글부터 정렬해서 가져오기, 올린 사람의 닉네임도 같이 묶어서 가져오기
    const posts = await HandMeDown.find()
      .sort({ createdAt: -1 })
      .populate('ownerId', 'nickname');

    res.status(200).json(posts);
  } catch (error) {
    console.error('물려주기 목록 조회 에러:', error);
    res.status(500).json({ message: '목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

// 🔄 [PUT] 거래 상태 변경하기 (대기중 <-> 완료) (주소: /api/handmedowns/:id/status)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const post = await HandMeDown.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
    }

    // 내가 올린 글만 상태 변경 가능
    if (post.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '본인이 올린 글만 상태를 변경할 수 있습니다!' });
    }

    // 상태 토글 (AVAILABLE 이면 COMPLETED 로, COMPLETED 면 AVAILABLE 로)
    post.status = post.status === 'AVAILABLE' ? 'COMPLETED' : 'AVAILABLE';
    await post.save();

    res.status(200).json({ 
      message: '나눔 상태가 변경되었습니다.', 
      status: post.status 
    });
  } catch (error) {
    res.status(500).json({ message: '상태 변경 중 에러가 발생했습니다.' });
  }
});

// 💣 [DELETE] 물려주기 게시글 삭제하기 (주소: /api/handmedowns/:id)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await HandMeDown.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: '삭제하려는 게시글이 존재하지 않습니다.' });
    }

    // 내가 올린 글만 삭제 가능
    if (post.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '본인이 올린 글만 삭제할 수 있습니다! ❌' });
    }

    await HandMeDown.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: '물려주기 게시글이 삭제되었습니다. 🗑️' });
  } catch (error) {
    res.status(500).json({ message: '게시글 삭제 중 에러가 발생했습니다.' });
  }
});

module.exports = router;
