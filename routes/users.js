const express = require('express');
const router = express.Router();
const User = require('../models/User'); // 아까 만든 유저 설계도 불러오기

// 🎯 [POST] 회원가입 API (주소: /api/users/register)
router.post('/register', async (req, res) => {
  try {
    // 1. 프론트엔드(하민님)가 보낸 데이터(이메일, 닉네임)를 꺼냄
    const { email, nickname } = req.body;

    // 2. 이미 가입된 이메일인지 몽고DB를 뒤져서 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 가입된 이메일입니다!' });
    }

    // 3. 설계도(User)를 바탕으로 새로운 유저 데이터 생성
    const newUser = new User({
      email,
      nickname
    });

    // 4. 진짜 몽고DB 금고에 저장! (save)
    await newUser.save();

    // 5. 프론트엔드에 "가입 성공했어!" 하고 결과 돌려주기
    res.status(201).json({ message: '회원가입 성공!', user: newUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

module.exports = router;