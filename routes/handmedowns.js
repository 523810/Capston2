const express = require('express');
const router = express.Router();
const HandMeDown = require('../models/HandMeDown');
const auth = require('../middleware/auth'); // 문지기
const multer = require('multer'); // 📸 사진 업로드 라이브러리 추가!
const path = require('path');
const fs = require('fs');

// 📁 업로드 폴더가 없으면 자동으로 만들어주기
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 📦 사진 파일 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 🎯 [POST] 물려주기 게시판에 새 글 올리기 (주소: /api/handmedowns)
// 💡 프론트엔드에서 필드명을 'image'가 아닌 다른 이름(예: bookThumbnail)으로 보낼 때 
// multer가 500 에러(Unexpected field)를 던지는 것을 방지하기 위해 upload.any()를 사용합니다.
// 🎯 [POST] 물려주기 게시판에 새 글 올리기 (주소: /api/handmedowns)
// 💡 프론트엔드에서 필드명을 'image'가 아닌 다른 이름(예: bookThumbnail)으로 보낼 때 
// multer가 500 에러(Unexpected field)를 던지는 것을 방지하기 위해 upload.any()를 사용합니다.
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    const { bookTitle, bookThumbnail, bookAuthor, comment, contactLink, tradeType } = req.body;

    // 1. 여러 장의 사진 경로를 담을 빈 바구니 준비
    let imageUrls = [];

    // 2. 프론트엔드에서 사진 파일들을 폼데이터로 보냈다면, 전부 찾아서 바구니에 담기
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    // 3. 기존 bookThumbnail(단일 대표 이미지) 호환성 유지 
    // 파일이 여러 개 왔다면 첫 번째 사진을 대표로 쓰고, 파일이 아예 없다면 프론트가 텍스트로 보낸 주소(bookThumbnail)를 씀
    const finalThumbnail = imageUrls.length > 0 ? imageUrls[0] : bookThumbnail;

    const newPost = new HandMeDown({
      ownerId: req.user.id, // 토큰에서 자동 추출
      bookTitle,
      bookThumbnail: finalThumbnail, 
      images: imageUrls, // 👈 🚀 핵심! 여러 장의 사진 경로 배열 통째로 저장!
      bookAuthor,
      comment,
      contactLink,
      tradeType: tradeType || 'SHARE' // 프론트에서 안 보내면 기본값 '나눔(SHARE)'
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
    const { tradeType } = req.query; // 프론트에서 탭 누를 때 보내는 조건

    let queryCondition = {};
    if (tradeType) {
      // 대소문자 방어 및 한글 방어
      const type = tradeType.toUpperCase();
      if (type === '나눔' || type === 'SHARE') queryCondition.tradeType = 'SHARE';
      else if (type === '교환' || type === 'EXCHANGE') queryCondition.tradeType = 'EXCHANGE';
      else queryCondition.tradeType = type;
    }

    // 최신 글부터 정렬해서 가져오기, 올린 사람의 닉네임도 같이 묶어서 가져오기
    const posts = await HandMeDown.find(queryCondition)
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

// 🛠️ [PUT] 물려주기 게시글 내용 수정하기 (주소: /api/handmedowns/:id)
router.put('/:id', auth, upload.any(), async (req, res) => {
  try {
    const post = await HandMeDown.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
    }

    // 내가 올린 글만 수정 가능
    if (post.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '본인이 올린 글만 수정할 수 있습니다! ❌' });
    }

    const { bookTitle, bookAuthor, comment, contactLink, tradeType } = req.body;
    
    // 💡 이미지 수정: 새 이미지가 업로드되었다면 교체, 아니면 기존 이미지 유지
    let imageUrls = post.images || [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
      post.bookThumbnail = imageUrls[0]; // 대표 썸네일 업데이트
    }

    // 변경된 텍스트 내용 업데이트
    if (bookTitle) post.bookTitle = bookTitle;
    if (bookAuthor) post.bookAuthor = bookAuthor;
    if (comment) post.comment = comment;
    if (contactLink) post.contactLink = contactLink;
    if (tradeType) post.tradeType = tradeType;
    post.images = imageUrls;

    await post.save();

    res.status(200).json({ message: '물려주기 게시글이 성공적으로 수정되었습니다! ✨', post });
  } catch (error) {
    console.error('게시글 수정 에러:', error);
    res.status(500).json({ message: '게시글 수정 중 에러가 발생했습니다.' });
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
