const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const crypto = require('crypto'); // 👈 6자리 랜덤 코드를 뽑아주는 Node 기본 마법 도구!
const auth = require('../middleware/auth'); // 👈 문지기 미들웨어 불러오기

// 🎯 [POST] 새 교환독서 모임방 만들기 (비밀번호 필수!)
router.post('/', async (req, res) => {
  try {
    // 💡 프론트에서 방 비밀번호(roomPassword) 및 카테고리(category), 소개글(description)까지 받아오기
    let { roomType, roomName, roomPassword, hostId, maxMembers, category, description } = req.body;

    // 프론트에서 한글로 카테고리를 보낼 경우 영어(Enum)로 변환
    if (category === '독서모임') category = 'READING';
    if (category === '도서교환') category = 'EXCHANGE';
    if (category === '물려주기') category = 'HANDMEDOWN';

    // 💡 프론트에서 '온라인'/'오프라인'으로 보낼 경우 DB 규칙에 맞게 영어로 강제 변환
    if (roomType === '온라인') roomType = 'ONLINE';
    if (roomType === '오프라인' || roomType === '로컬') roomType = 'LOCAL';

    // 💡 6자리 고유 초대 코드 마법 생성기 (예: "A1B2C3")
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    // 1. 새로운 방 데이터 조립!
    const newRoom = new Room({
      roomType,
      category: category || 'READING', // 기본값은 독서모임
      roomName,
      description,  // 👈 추가됨: 프론트가 보내준 모임방 소개글 저장
      roomPassword, // 👈 쉿! 비밀방 암호 저장
      inviteCode,   // 👈 새로 만든 6자리 자동 코드 등록!
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

// 🎯 [GET] 방 목록 똑똑하게 조회하기 (검색 & 내가 참여한 방 필터링)
router.get('/', async (req, res) => {
  try {
    // 1. 프론트엔드가 주소창 끝에 달고 보내는 조건(Query)들 받아오기
    const { userId, search } = req.query;

    // 2. 몽고DB한테 "이 조건으로 찾아줘!" 할 검색어 상자 만들기
    let queryCondition = {};

    // 조건 A: "내가 참여 중인 방" 탭을 눌렀을 때
    if (userId) {
      // members 배열 안의 userId가 내 아이디랑 일치하는 방만 찾아라!
      queryCondition['members.userId'] = userId;
    }

    // 조건 B: 검색창에 제목을 쳤을 때 (예: "해리포터")
    if (search) {
      // 대소문자 구분 없이($options: 'i'), 검색어가 포함된($regex) 방 제목 찾아라!
      queryCondition.roomName = { $regex: search, $options: 'i' };
    }

    // 3. 조건 상자 들고 금고 가서 최신순(createdAt: -1)으로 꺼내오기!
    const rooms = await Room.find(queryCondition).sort({ createdAt: -1 });

    res.status(200).json(rooms);

  } catch (error) {
    console.error('방 목록 조회 에러:', error);
    res.status(500).json({ message: '방 목록 조회에 실패했습니다.' });
  }
});

// 🎯 [GET] 특정 방 1개 상세정보 가져오기 (방 상세페이지용)
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    }
    res.status(200).json(room);
  } catch (error) {
    console.error('방 상세정보 조회 에러:', error);
    res.status(500).json({ message: '방 정보를 불러오는데 실패했습니다.' });
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

    // 💎 추가된 문지기 검사 2.5: "방에 자리 있나요?" (정원 초과 검사)
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ message: '방 정원이 꽉 차서 입장할 수 없습니다. 😭' });
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

// 🎯 [POST] 초대 코드로 방 입장하기 (주소: /api/rooms/join-by-code)
router.post('/join-by-code', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;

    // 1. 코드로 그 방이 진짜 있는지 찾기
    const room = await Room.findOne({ inviteCode });
    if (!room) {
      return res.status(404).json({ message: '유효하지 않은 초대 코드입니다. ❌ 다시 확인해주세요.' });
    }

    // 2. 문지기 검사 1: "방에 자리 있나요?"
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ message: '방 정원이 꽉 차서 입장할 수 없습니다. 😭' });
    }

    // 3. 문지기 검사 2: "이미 들어온 사람 아닌가요?"
    const isAlreadyMember = room.members.some(member => member.userId.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).json({ message: '이미 님이 참여 중인 방입니다. 🙋‍♂️' });
    }

    // 4. 모든 검사 통과! 명단에 이름 적어주기 📝
    room.members.push({ userId });

    // 5. 변경된 명단 DB에 최종 저장!
    await room.save();

    res.status(200).json({
      message: '초대 코드로 방 입장에 성공했습니다! 환영합니다! 🎉',
      room // 업데이트된 방 정보 통째로 던져주기
    });

  } catch (error) {
    console.error('초대 코드 입장 에러:', error);
    res.status(500).json({ message: '초대 코드 입장 처리 중 에러가 발생했습니다.' });
  }
});

// 🎯 [PATCH] 내 독서 진도(읽은 페이지 수) 업데이트하기 (주소: /api/rooms/:roomId/progress)
router.patch('/:roomId/progress', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, readPages } = req.body; // 프론트에서 "나(userId) 몇 페이지(readPages) 읽었어!" 하고 보냄

    // 1. 일단 그 방이 있는지 찾기
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    }

    // 2. 명단(members)에서 내 이름(userId) 찾기
    const memberIndex = room.members.findIndex(m => m.userId.toString() === userId);

    // 만약 명단에 내가 없다면? 쫓아내기!
    if (memberIndex === -1) {
      return res.status(403).json({ message: '이 방의 참여자가 아닙니다. ❌' });
    }

    // 3. 찾았다면? 읽은 페이지 수 쫙 올려주기! 📈
    room.members[memberIndex].readPages = readPages;

    // 4. 변경된 명단 DB에 최종 저장!
    await room.save();

    res.status(200).json({
      message: '진도율이 성공적으로 갱신되었습니다! 🚀',
      room: room // 업데이트된 방 정보 통째로 던져주기 (프론트가 이거 보고 게이지 그림)
    });

  } catch (error) {
    console.error('진도율 업데이트 에러:', error);
    res.status(500).json({ message: '진도율 업데이트에 실패했습니다.' });
  }
});

// 💣 [DELETE] 모임방 폭파(삭제)하기 (주소: /api/rooms/:roomId)
router.delete('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '삭제하려는 방이 존재하지 않습니다.' });
    }

    // 보안 검사: "방장 본인이 맞습니까?"
    // 토큰에서 추출한 내 아이디(req.user.id)와 방장 아이디(room.hostId) 비교
    if (room.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: '방장만 방을 삭제할 수 있습니다! ❌' });
    }

    // 방장 본인이 맞으면 삭제 실행!
    await Room.findByIdAndDelete(roomId);

    res.status(200).json({ message: '모임방이 성공적으로 삭제되었습니다. 🗑️' });
  } catch (error) {
    console.error('방 삭제 에러:', error);
    res.status(500).json({ message: '방 삭제 중 에러가 발생했습니다.' });
  }
});

// 📚 [PATCH] 모임방에 읽을 책 등록/변경하기 (주소: /api/rooms/:roomId/book)
router.patch('/:roomId/book', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    // 프론트에서 알라딘 API 등으로 검색한 책 정보를 통째로 보냄
    const { title, author, isbn, thumbnail, publisher, datetime, contents } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    }

    // 방장만 책을 바꿀 수 있게 하려면 아래 주석 해제 (일단 누구나 가능하게 둠)
    // if (room.hostId.toString() !== req.user.id) return res.status(403).json({ message: '방장만 책을 등록할 수 있습니다.' });

    const Book = require('../models/Book'); // 책 모델 불러오기

    // 1. 우리 DB에 이미 있는 책인지 ISBN으로 검사
    let book = await Book.findOne({ isbn });

    // 2. 없는 책이면 새로 DB에 저장
    if (!book) {
      book = new Book({
        title,
        author,
        isbn,
        thumbnail,
        publisher,
        datetime,
        contents
      });
      await book.save();
    }

    // 3. 방 정보에 책 ID 연결
    room.bookId = book._id;
    await room.save();

    res.status(200).json({
      message: '모임방에 책이 성공적으로 등록되었습니다! 📚',
      book: book // 등록된 책 정보 보내주기
    });

  } catch (error) {
    console.error('책 등록 에러:', error);
    res.status(500).json({ message: '책 등록 중 에러가 발생했습니다.' });
  }
});

module.exports = router;