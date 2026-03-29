const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // 👈 방금 설치한 마법의 암호화 도구 불러오기!
const User = require('../models/User');

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

module.exports = router;