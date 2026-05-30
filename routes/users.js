const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const ReadingLog = require('../models/ReadingLog'); // 💡 독서 온도 계산에 독서 기록도 반영!
const auth = require('../middleware/auth');


// 🎯 [POST] '진짜' 회원가입 API (주소: /api/users/register)
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname, phone } = req.body;

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
      nickname,
      phone: phone || null // 📱 전화번호 추가!
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
      { expiresIn: '1d' } // 💡 24시간 유지 (기존 1h → 1d)
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

// 🎯 [POST] 이메일 찾기 API (주소: /api/users/find-email)
// 닉네임과 전화번호가 일치하면 가입된 이메일 중 앞의 일부만 가려서(선택사항) 알려줍니다.
router.post('/find-email', async (req, res) => {
  try {
    const { nickname, phone } = req.body;

    if (!nickname || !phone) {
      return res.status(400).json({ message: '닉네임과 전화번호를 모두 입력해주세요!' });
    }

    const user = await User.findOne({ nickname, phone });

    if (!user) {
      return res.status(404).json({ message: '입력하신 정보와 일치하는 계정이 없습니다.' });
    }

    // 보안을 위해 이메일 뒷부분을 별표 처리할 수도 있지만, 일단 전체를 다 돌려주도록 하겠습니다.
    res.status(200).json({
      message: '이메일을 찾았습니다!',
      email: user.email
    });
  } catch (error) {
    console.error('이메일 찾기 에러:', error);
    res.status(500).json({ message: '이메일 찾기 중 서버 에러가 발생했습니다.' });
  }
});

// 🎯 [POST] 비밀번호 재설정 API (주소: /api/users/reset-password)
// 이메일 인증이 불가능하므로, '이메일'과 '가입할 때 썼던 닉네임' 두 가지가 모두 일치하면 비밀번호를 바꿔줍니다!
router.post('/reset-password', async (req, res) => {
  try {
    const { email, nickname, newPassword } = req.body;

    if (!email || !nickname || !newPassword) {
      return res.status(400).json({ message: '이메일, 닉네임, 새 비밀번호를 모두 입력해주세요!' });
    }

    // 1. 문지기 검사: "이메일이랑 닉네임이 정확히 일치하는 유저가 있나?"
    const user = await User.findOne({ email, nickname });
    if (!user) {
      return res.status(404).json({ message: '입력하신 이메일과 닉네임에 일치하는 회원 정보가 없습니다.' });
    }

    // 2. 새 비밀번호 암호화 (소금 치기)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. 비밀번호 업데이트 및 저장
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: '비밀번호가 성공적으로 재설정되었습니다! 새 비밀번호로 로그인해주세요. 🔐' });
  } catch (error) {
    console.error('비밀번호 재설정 에러:', error);
    res.status(500).json({ message: '비밀번호 재설정 중 서버 에러가 발생했습니다.' });
  }
});

// 👤 [GET] 내 정보 불러오기 API (주소: /api/users/me) - 프로필 수정 화면 등에서 사용
router.get('/me', auth, async (req, res) => {
  try {
    // 토큰에서 추출한 내 ID로 DB 조회 (비밀번호는 안전하게 제외)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '유저 정보를 찾을 수 없습니다.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('내 정보 조회 에러:', error);
    res.status(500).json({ message: '내 정보를 불러오는 중 에러가 발생했습니다.' });
  }
});

// 🎯 [GET] 마이페이지 유저 통계 가져오기 (주소: /api/users/:userId/profile)
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    // 0. 유저 기본 정보(MBTI 등) 가져오기
    const User = require('../models/User');
    const user = await User.findById(userId).select('-password'); // 비밀번호는 빼고!

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

    // 4. 💡 개선됨: 독서 기록(reading-logs)에서도 읽은 페이지 합산!
    const readingLogs = await ReadingLog.find({ userId });
    const logReadPages = readingLogs.reduce((sum, log) => sum + (log.readPages || 0), 0);
    const combinedPages = totalReadPages + logReadPages; // 모임방 + 독서기록 합산

    // 5. 🌡️ 독서 온도 계산 (기본 체온 36.5 + 합산 페이지 10장당 0.1도 상승)
    let readingTemp = 36.5 + (combinedPages / 100);
    if (readingTemp > 100) readingTemp = 100;

    // 🏆 독서 레벨(칭호) 부여 시스템!
    let readingLevel = '🌱 독서 새싹';
    if (combinedPages >= 1000) readingLevel = '👑 독서의 신';
    else if (combinedPages >= 500) readingLevel = '🦅 지식 탐험가';
    else if (combinedPages >= 100) readingLevel = '🐛 활자 중독 책벌레';

    // 6. 프론트엔드가 받기 좋게 포장해서 전달
    res.status(200).json({
      message: '프로필 통계 조회 성공! 📊',
      user: user,
      stats: {
        temperature: readingTemp.toFixed(1),
        participatingRooms: participatingCount,
        finishedBooks: finishedCount,
        totalReadPages: combinedPages, // 모임방 + 독서기록 합산 페이지
        readingLevel // 방금 만든 독서 칭호 추가!
      }
    });

  } catch (error) {
    console.error('프로필 통계 에러:', error);
    res.status(500).json({ message: '프로필 통계를 불러오는데 실패했습니다.' });
  }
});
// 🎯 [PUT] 마이페이지 프로필 수정 API (주소: /api/users/profile)
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, newPassword, phone } = req.body;
    const userId = req.user.id; // auth 미들웨어가 챙겨준 내 ID

    // 바꿀 정보 바구니
    let updateFields = {};
    if (nickname) updateFields.nickname = nickname;
    if (phone) updateFields.phone = phone; // 📱 전화번호 수정 추가!

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

    res.status(200).json({
      message: '프로필이 성공적으로 수정되었습니다.',
      user: { nickname: updatedUser.nickname, email: updatedUser.email }
    });
  } catch (error) {
    console.error('프로필 수정 에러:', error);
    res.status(500).json({ message: '프로필 수정 중 에러가 발생했습니다.' });
  }
});

// 🎯 [DELETE] 회원 탈퇴 API (주소: /api/users/withdraw)
router.delete('/withdraw', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. 유저 정보 삭제
    await User.findByIdAndDelete(userId);

    // 2. (선택) 이 유저가 쓴 글도 다 지워줄 수 있음 (일단 유저만 지우는 것으로 처리)
    // await Annotation.deleteMany({ userId });

    res.status(200).json({ message: '회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.' });
  } catch (error) {
    console.error('회원 탈퇴 에러:', error);
    res.status(500).json({ message: '회원 탈퇴 처리 중 에러가 발생했습니다.' });
  }
});

// 🧠 [POST] 독서 MBTI (독서 성향 테스트) 결과 저장 API (주소: /api/users/mbti)
router.post('/mbti', auth, async (req, res) => {
  try {
    const { answers } = req.body; // 예: [1, 3, 2, 1, 3]

    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: '답변을 입력해주세요!' });
    }

    // 💡 개선됨: 모든 답변을 합산해서 비율로 성향 분류
    // 각 답변은 1(감성적), 2(실용적), 3(탐구적) 중 하나
    const total = answers.reduce((sum, a) => sum + a, 0);
    const maxPossible = answers.length * 3; // 최대 가능 점수
    const ratio = total / maxPossible; // 0~1 사이 비율

    let mbtiResult, recommendedGenre, description;

    if (ratio < 0.35) {
      mbtiResult = '감성충만 새벽독서가';
      recommendedGenre = '소설/시/에세이';
      description = '감수성이 풍부하고 문학적 표현을 사랑합니다.';
    } else if (ratio < 0.50) {
      mbtiResult = '공감하는 이야기꾼';
      recommendedGenre = '소설/에세이/인문';
      description = '사람과 이야기에 관심이 많고 공감 능력이 뛰어납니다.';
    } else if (ratio < 0.62) {
      mbtiResult = '트렌드 얼리어답터';
      recommendedGenre = '자기계발/경제경영';
      description = '실용적인 지식을 빠르게 습득하고 적용하는 것을 좋아합니다.';
    } else if (ratio < 0.78) {
      mbtiResult = '논리정연 철학자';
      recommendedGenre = '인문/철학/과학';
      description = '깊은 사고와 논리적 분석을 즐기는 독서가입니다.';
    } else {
      mbtiResult = '사색하는 인문학자';
      recommendedGenre = '역사/철학/고전';
      description = '넓은 시각으로 인류의 지혜를 탐구하는 깊이있는 독서가입니다.';
    }

    // DB에 결과 저장
    await User.findByIdAndUpdate(req.user.id, { readingMbti: mbtiResult }, { new: true });

    res.status(200).json({
      message: '독서 성향 분석이 완료되었습니다!',
      mbti: mbtiResult,
      recommendedGenre,
      description
    });
  } catch (error) {
    console.error('MBTI 저장 에러:', error);
    res.status(500).json({ message: '성향 테스트 결과를 저장하는 중 에러가 발생했습니다.' });
  }
});
// 🤝 [GET] MBTI 기반 찰떡궁합 독서 짝꿍 추천 (주소: /api/users/recommend-friends)
router.get('/recommend-friends', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);

    // 만약 내가 아직 MBTI 검사를 안 했다면?
    if (!me.readingMbti) {
      return res.status(200).json({
        message: 'MBTI 검사를 먼저 진행해주세요!',
        recommended: []
      });
    }

    // 나랑 같은 MBTI를 가진 유저들 찾기 (나 자신은 제외, 이미 팔로우한 사람도 제외하면 좋지만 캡스톤이니까 심플하게 나만 제외!)
    // 최대 4명까지만 랜덤 느낌으로 뽑아주기 (최신 가입자 순)
    const recommendedUsers = await User.find({
      readingMbti: me.readingMbti,
      _id: { $ne: req.user.id } // $ne = Not Equal (나랑 아이디가 다른 사람만)
    })
      .select('nickname email readingMbti') // 비밀번호는 빼고 예쁘게 포장
      .sort({ createdAt: -1 })
      .limit(4);

    res.status(200).json({
      message: `나와 같은 '${me.readingMbti}' 성향을 가진 분들이에요!`,
      recommended: recommendedUsers
    });

  } catch (error) {
    console.error('친구 추천 에러:', error);
    res.status(500).json({ message: '추천 친구를 불러오는 중 에러가 발생했습니다.' });
  }
});

// 🔎 [GET] 친구 검색 API (주소: /api/users/search?keyword=하민)
router.get('/search', auth, async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ message: '검색어를 입력해주세요!' });
    }

    // 닉네임이나 이메일에 검색어가 포함된 유저 찾기 (정규식 사용, 대소문자 무시)
    const users = await User.find({
      $or: [
        { nickname: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ]
    }).select('nickname email readingMbti'); // 비밀번호 등은 빼고 안전하게 전달

    res.status(200).json(users);
  } catch (error) {
    console.error('유저 검색 에러:', error);
    res.status(500).json({ message: '유저 검색 중 에러가 발생했습니다.' });
  }
});

// 🤝 [POST] 팔로우 / 언팔로우 토글 API (주소: /api/users/:targetUserId/follow)
router.post('/:targetUserId/follow', auth, async (req, res) => {
  try {
    const myId = req.user.id; // 내 아이디
    const { targetUserId } = req.params; // 내가 누른 상대방 아이디

    if (myId === targetUserId) {
      return res.status(400).json({ message: '자기 자신은 팔로우할 수 없습니다. 😅' });
    }

    const me = await User.findById(myId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: '존재하지 않는 유저입니다.' });
    }

    // 이미 팔로우 중인지 확인
    const isFollowing = me.following.includes(targetUserId);

    if (isFollowing) {
      // 💔 언팔로우 처리: 내 following 명단에서 빼고, 상대방 followers 명단에서 나를 뺌
      me.following.pull(targetUserId);
      targetUser.followers.pull(myId);
      await me.save();
      await targetUser.save();
      return res.status(200).json({ message: '언팔로우 되었습니다.', isFollowing: false });
    } else {
      // 💖 팔로우 처리: 내 following 명단에 넣고, 상대방 followers 명단에 나를 넣음
      me.following.push(targetUserId);
      targetUser.followers.push(myId);
      await me.save();
      await targetUser.save();
      return res.status(200).json({ message: '팔로우 성공!', isFollowing: true });
    }
  } catch (error) {
    console.error('팔로우 처리 에러:', error);
    res.status(500).json({ message: '팔로우 처리 중 에러가 발생했습니다.' });
  }
});

// 👥 [GET] 내가 팔로우하는 사람들 목록 보기 (주소: /api/users/:userId/following)
router.get('/:userId/following', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'nickname email readingMbti');
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    res.status(200).json(user.following);
  } catch (error) {
    res.status(500).json({ message: '팔로잉 목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

// 👀 [GET] 나를 팔로우하는 사람들 목록 보기 (주소: /api/users/:userId/followers)
router.get('/:userId/followers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'nickname email readingMbti');
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    res.status(200).json(user.followers);
  } catch (error) {
    res.status(500).json({ message: '팔로워 목록을 불러오는 중 에러가 발생했습니다.' });
  }
});

module.exports = router;