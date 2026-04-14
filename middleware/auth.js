const jwt = require('jsonwebtoken');

// 🛡️ 문지기 미들웨어 (이 티켓(토큰)이 진짜인지 가짜인지 검사합니다!)
const auth = (req, res, next) => {
  // 1. 프론트엔드가 요청을 보낼 때 머리글(Header)에 티켓을 넣어서 보냄
  // 보통 'Bearer <토큰>' 형태로 옵니다.
  const authHeader = req.header('Authorization');

  // 티켓을 아예 안 가져왔으면 쫓아냄!
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 없습니다. 먼저 로그인해주세요! ⛔' });
  }

  try {
    // 2. 'Bearer ' 글자를 떼어내고 순수 토큰만 분리
    const token = authHeader.split(' ')[1];

    // 3. 서버가 가진 비밀 도장(JWT_SECRET)으로 이 토큰이 우리가 발급한 게 맞는지, 유효기간이 안 지났는지 검사
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySuperSecretKey');

    // 4. 검사 통과! 토큰 안에 들어있던 유저 ID를 req.user에 예쁘게 담아서 다음 코드로 넘겨줌.
    // 이제 앞으로 이 라우터를 타는 API들은 '이게 누구의 요청인지(req.user.id)' 쉽게 알 수 있음!
    req.user = decoded; 
    
    // 5. 문 열어주기! "통과하세요~"
    next(); 
  } catch (error) {
    // 토큰이 위조되었거나 유효기간이 만료된 경우
    console.error('토큰 검증 에러:', error.message);
    res.status(401).json({ message: '유효하지 않은 토큰입니다. 다시 로그인해주세요! ❌' });
  }
};

module.exports = auth;
