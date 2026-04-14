const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // 👈 방금 설치한 마법의 암호화 도구 불러오기!
const jwt = require('jsonwebtoken'); // 👈 이거 한 줄 추가!
const User = require('../models/User');
const Room = require('../models/Room');

// 🎯 [POST] '진짜' 회원가입 API (주소: /api/users/register)
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // 1. 깐깐한 문지기: "잠깐! 이미 가입된 이메일인지 DB 금고 확인 좀 할게요!"
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다. 다른 이메일을 입력해 주세요!' });
    }

    // 2. 소금 팍팍 치기: "비밀번호를 외계어로 갈아버리자!"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. 금고에 넣을 새 유저 정보 조립 (원본 비밀번호 대신 암호화된 비밀번호 넣기!)
    const newUser = new User({
      email,
      password: hashedPassword,
      nickname
    });

    // 4. DB 금고에 저장!
    await newUser.save();

    // 5. 성공 응답 쏴주기 (💡 보안을 위해 프론트엔드에 응답할 때 비밀번호는 빼고 보내주는 센스!)
    res.status(201).json({ 
      message: '회원가입 대성공! 이제 로그인할 수 있습니다.', 
      user: {
        id: newUser._id,
        email: newUser.email,
        nickname: newUser.nickname
      } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '회원가입 처리 중 에러가 발생했습니다.' });
  }
});

// 🎯 [POST] '진짜' 로그인 API (주소: /api/users/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 문지기 1차 검사: "우리 DB에 가입된 이메일 맞나요?"
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '가입되지 않은 이메일입니다.' });
    }

    // 2. 깐깐한 비밀번호 검사: "입력한 비번 갈아서 DB 외계어랑 비교할게요!"
    const isMatch = await bcrypt.compare(password, user.password); // 👈 핵심 마법 1줄!
    
    if (!isMatch) {
      return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // 🎟️ 자유이용권(토큰) 발급! 
    // 유저 고유 ID를 담아서, 비밀 도장(환경변수 JWT_SECRET)으로 꽉 찍어줌! (유효기간 1시간)
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'mySuperSecretKey', 
      { expiresIn: '1h' }
    );

    // 3. 문 열어주기! (성공 응답)
    res.status(200).json({
      message: '로그인 대성공! 교환독서에 오신 것을 환영합니다!',
      token, // 👈 프론트엔드로 팔찌(토큰) 데이터 쏴주기!
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '로그인 처리 중 에러가 발생했습니다.' });
  }
});

// 🎯 [GET] 마이페이지 유저 통계 가져오기 (주소: /api/users/:userId/profile)
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. 영우가 참여 중인 모든 방(Room) 싹 다 긁어오기
    const myRooms = await Room.find({ 'members.userId': userId });

    // 2. 통계 계산을 위한 바구니 준비
    let participatingCount = myRooms.length; // 참여 중인 모임 수
    let totalReadPages = 0;                  // 총 읽은 페이지 수
    let finishedCount = 0;                   // 완독한 책 수

    // 3. 방 하나하나 돌면서 영우의 진도율 뽑아오기
    myRooms.forEach(room => {
      // 이 방에서 내 이름표(userId)를 달고 있는 데이터만 쏙 찾기
      const myInfo = room.members.find(m => m.userId.toString() === userId);
      
      if (myInfo) {
        totalReadPages += myInfo.readPages; // 총 읽은 페이지에 누적!
        
        // 💡 임시 완독 로직: 일단 100페이지 이상 읽었으면 완독으로 치자! 
        // (나중에 책의 실제 총 페이지 수와 비교하도록 업그레이드 가능)
        if (myInfo.readPages >= 100) {
          finishedCount += 1;
        }
      }
    });

    // 4. 하이라이트! 🌡️ 독서 온도 계산 로직 
    // (기본 체온 36.5도 + 읽은 페이지 10장당 0.1도 상승!)
    let readingTemp = 36.5 + (totalReadPages / 100);
    if (readingTemp > 100) readingTemp = 100; // 최고 온도는 100도로 제한🔥

    // 5. 프론트엔드가 받기 좋게 예쁘게 포장해서 던져주기
    res.status(200).json({
      message: '프로필 통계 조회 성공! 📊',
      stats: {
        temperature: readingTemp.toFixed(1), // 소수점 첫째 자리까지만 예쁘게 자르기
        participatingRooms: participatingCount,
        finishedBooks: finishedCount,
        totalReadPages: totalReadPages
      }
    });

  } catch (error) {
    console.error('프로필 통계 에러:', error);
    res.status(500).json({ message: '프로필 통계를 불러오는데 실패했습니다.' });
  }
});

module.exports = router;