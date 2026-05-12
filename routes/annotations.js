const express = require('express');
const router = express.Router();
const Annotation = require('../models/Annotation');
const Book = require('../models/Book');
const auth = require('../middleware/auth'); // 👈 문지기 미들웨어 불러오기
const multer = require('multer'); // 사진 업로드를 위한 라이브러리
const path = require('path');
const fs = require('fs');

// 📁 업로드 폴더가 없으면 자동으로 만들어주기
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 📦 사진 파일 저장 설정 (이름 겹치지 않게 현재 시간 붙여서 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 🧑‍💻 [GET] 내 문장 수집함: 내가 쓴 피드만 모아보기 (마이페이지용)
// ⚠️ 반드시 다른 :roomId 라우터보다 위에 있어야 'my'를 아이디로 착각하지 않음!
router.get('/my', auth, async (req, res) => {
  try {
    // auth 미들웨어를 통과했으므로 req.user.id 에 내 아이디가 들어있음
    const myAnnotations = await Annotation.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('bookId', 'title thumbnail') // 책 정보도 같이 가져옴
      .populate('userId', 'nickname');

    res.status(200).json(myAnnotations);
  } catch (error) {
    console.error('내 문장 불러오기 에러:', error);
    res.status(500).json({ message: '내 문장 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 💖 [GET] 내가 '좋아요(스크랩)' 누른 문장들만 모아보기 (마이페이지용)
router.get('/scraps', auth, async (req, res) => {
  try {
    // likes 배열 안에 내 아이디(req.user.id)가 포함된 피드만 쏙 뽑아오기
    const scrapedAnnotations = await Annotation.find({ likes: req.user.id })
      .sort({ createdAt: -1 })
      .populate('bookId', 'title thumbnail') 
      .populate('userId', 'nickname');

    res.status(200).json(scrapedAnnotations);
  } catch (error) {
    console.error('스크랩 불러오기 에러:', error);
    res.status(500).json({ message: '스크랩 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 🎯 [POST] 책 피드(게시판)에 새 글/사진 남기기 (multer 추가!)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('📥 [피드 업로드 요청 들어옴] 데이터:', req.body);
    const { roomId, bookId, annotationType, quote, content, text, color } = req.body;
    const userId = req.user.id; // 프론트에서 body로 안 보내도, 토큰(auth)에서 자동으로 빼내기!
    
    // 사진 파일이 정상적으로 택배로 왔다면 해당 파일의 경로를 저장, 아니면 빈 문자열
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    // 하민님이 프론트에서 변수명을 quote가 아닌 content나 text로 보냈을 때를 대비한 방어 코드!
    const finalQuote = quote || content || text;

    if (!finalQuote) {
      return res.status(400).json({ message: '게시글 내용(quote/content/text)이 비어있습니다!' });
    }

    // 1. 새 피드 데이터 조립
    const newAnnotation = new Annotation({
      roomId,
      userId,
      bookId, // 피드를 올릴 때 랭킹 점수를 위해 책 ID 필수! (현재 DB 임시 해제 상태)
      annotationType, // 'QUOTE_TEXT' 또는 'PHOTO_MEMO'
      quote: finalQuote,
      imageUrl,
      color
    });

    // 2. DB 금고에 저장
    await newAnnotation.save();

    // 3. ⭐️ 글이 올라갔으니 해당 책의 랭킹(클릭수) 점수도 1점 팍 올려주기! (인기도 반영)
    if (bookId) {
      await Book.findByIdAndUpdate(bookId, { $inc: { clickCount: 1 } });
    }

    res.status(201).json({
      message: '텍스트힙 전시회에 기록이 성공적으로 추가되었습니다! ✍️',
      annotation: newAnnotation
    });

  } catch (error) {
    console.error('피드 저장 에러:', error);
    res.status(500).json({ message: '기록 저장 중 에러가 발생했습니다.', error: error.message });
  }
});

// 🖼️ [GET] 필사 전시회: 전체 모임방 최신 멋진 글귀 10개 구경하기 (앱 홈 화면용)
router.get('/exhibition', async (req, res) => {
  try {
    const { tab } = req.query; // 'NEW' 또는 'TRENDING'

    // 일단 DB에서 데이터를 다 가져온 후 (데이터가 적은 캡스톤용이라 가능)
    let annotations = await Annotation.find()
      .populate('bookId', 'title thumbnail')
      .populate('userId', 'nickname');

    // 프론트가 누른 탭에 따라 정렬 방식 바꾸기!
    if (tab && tab.toUpperCase() === 'TRENDING') {
      // TRENDING: 좋아요(likes 배열 길이)가 많은 순서대로 정렬
      annotations.sort((a, b) => b.likes.length - a.likes.length);
    } else {
      // 기본(NEW): 최신순(createdAt)으로 정렬
      annotations.sort((a, b) => b.createdAt - a.createdAt);
    }

    // 상위 10개만 짤라서 보내주기
    const top10Annotations = annotations.slice(0, 10);

    res.status(200).json(top10Annotations);
  } catch (error) {
    console.error('필사 전시회 에러:', error);
    res.status(500).json({ message: '전시회 데이터를 가져오는 중 에러가 발생했습니다.' });
  }
});

// 📖 [GET] 특정 모임방(roomId)에 올라온 피드 목록 쭈욱 구경하기 (모임방 내부 게시판용)
router.get('/:roomId', async (req, res) => {
  try {
    // 방 안에서는 옛날 글부터 최근 글로 보여줄 수도 있고, 최근 글부터 보여줄 수도 있음 (여기선 최근 글 먼저)
    const annotations = await Annotation.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .populate('userId', 'nickname');

    res.status(200).json(annotations);
  } catch (error) {
    res.status(500).json({ message: '모임방 피드 목록 조회 실패' });
  }
});

// ❤️ [POST] 좋아요(스크랩) 버튼 꾹 누르기 / 한 번 더 누르면 취소 (토글 기능)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const annotation = await Annotation.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: '해당 글을 찾을 수 없습니다.' });
    }

    // 이미 좋아요를 눌렀는지 확인 (내 아이디가 명단에 있는지 체크)
    const alreadyLiked = annotation.likes.includes(req.user.id);

    if (alreadyLiked) {
      // 이미 눌렀다면? -> 명단에서 내 이름 빼기 (좋아요 취소)
      annotation.likes.pull(req.user.id);
    } else {
      // 안 눌렀다면? -> 명단에 내 이름 넣기 (좋아요 등록)
      annotation.likes.push(req.user.id);
    }

    await annotation.save(); // DB에 반영 꾹!

    res.status(200).json({ 
      message: alreadyLiked ? '좋아요가 취소되었습니다.' : '마이페이지에 스크랩되었습니다! 💖',
      likesCount: annotation.likes.length,
      isLiked: !alreadyLiked
    });
  } catch (error) {
    console.error('좋아요 처리 에러:', error);
    res.status(500).json({ message: '좋아요 처리 중 에러가 발생했습니다.' });
  }
});

// 💣 [DELETE] 내가 쓴 피드(글/사진) 삭제하기 (주소: /api/annotations/:id)
router.delete('/:id', auth, async (req, res) => {
  try {
    const annotation = await Annotation.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ message: '삭제하려는 피드가 존재하지 않습니다.' });
    }

    // 보안 검사: "내가 쓴 글이 맞습니까?"
    // 토큰에서 추출한 내 아이디(req.user.id)와 글 작성자 아이디(annotation.userId) 비교
    if (annotation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: '본인이 작성한 글만 삭제할 수 있습니다! ❌' });
    }

    // 본인이 맞으면 삭제 실행!
    await Annotation.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: '기록이 성공적으로 삭제되었습니다. 🗑️' });
  } catch (error) {
    console.error('피드 삭제 에러:', error);
    res.status(500).json({ message: '피드 삭제 중 에러가 발생했습니다.' });
  }
});

module.exports = router;