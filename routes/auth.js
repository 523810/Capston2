const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');

// SendGrid API 키 설정 (환경변수에서 불러오기)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 📦 인증번호를 임시로 저장하는 메모리 창고 (DB 대신 빠른 임시 저장소!)
// { 이메일: { code: '123456', expiresAt: 만료시각 } } 형태로 저장
const otpStore = {};

// 📧 [POST] 이메일로 인증번호 발송 (주소: /api/auth/send-sms)
// 하민님 요청 주소(/api/auth/send-sms)를 그대로 유지하되, 실제로는 이메일로 발송!
router.post('/send-sms', async (req, res) => {
  try {
    const { phone, email } = req.body;

    // 이메일 또는 폰번호 둘 중 하나로 받을 수 있게 유연하게 처리
    const target = email || phone;

    if (!target) {
      return res.status(400).json({ message: '이메일(또는 phone)을 입력해주세요!' });
    }

    // 1. 6자리 랜덤 인증번호 생성! (예: 483921)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 메모리 창고에 5분 유효기간으로 저장
    otpStore[target] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 현재 시각 + 5분
    };

    // 3. SendGrid로 이메일 발송!
    const msg = {
      to: target,
      from: process.env.SENDGRID_FROM_EMAIL, // SendGrid에 등록된 발신자 이메일
      subject: '[교환독서] 이메일 인증번호',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a;">📚 교환독서 이메일 인증</h2>
          <p style="color: #444;">아래의 인증번호를 입력해주세요. 인증번호는 <strong>5분간 유효</strong>합니다.</p>
          <div style="background: #111; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #999; font-size: 12px;">본인이 요청하지 않은 경우 이 메일을 무시해주세요.</p>
        </div>
      `
    };

    await sgMail.send(msg);

    console.log(`📧 [인증번호 발송 완료] ${target} → ${code}`);
    res.status(200).json({ message: `인증번호가 ${target} 으로 발송되었습니다! 📧` });

  } catch (error) {
    console.error('인증번호 발송 에러:', error.response?.body || error.message);
    res.status(500).json({ message: '인증번호 발송 중 에러가 발생했습니다.' });
  }
});

// ✅ [POST] 인증번호 확인 (주소: /api/auth/verify-sms)
router.post('/verify-sms', (req, res) => {
  try {
    const { phone, email, code } = req.body;
    const target = email || phone;

    if (!target || !code) {
      return res.status(400).json({ message: '이메일(또는 phone)과 인증번호를 모두 입력해주세요!' });
    }

    const stored = otpStore[target];

    // 1. 아예 발송된 코드가 없으면
    if (!stored) {
      return res.status(400).json({ message: '인증번호를 먼저 요청해주세요!' });
    }

    // 2. 5분 만료 검사
    if (Date.now() > stored.expiresAt) {
      delete otpStore[target]; // 만료된 코드 즉시 삭제
      return res.status(400).json({ message: '인증번호가 만료되었습니다. 다시 요청해주세요!' });
    }

    // 3. 코드 일치 검사
    if (stored.code !== code) {
      return res.status(400).json({ message: '인증번호가 일치하지 않습니다. ❌' });
    }

    // 4. 인증 성공! 창고에서 삭제 (재사용 방지)
    delete otpStore[target];
    console.log(`✅ [인증 성공] ${target}`);
    res.status(200).json({ message: '이메일 인증에 성공했습니다! ✅', verified: true });

  } catch (error) {
    console.error('인증번호 확인 에러:', error);
    res.status(500).json({ message: '인증번호 확인 중 에러가 발생했습니다.' });
  }
});

module.exports = router;
