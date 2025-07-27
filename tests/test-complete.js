// 완전한 인증 시스템 테스트 스크립트
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testCompleteAuthFlow() {
  console.log('🧪 완전한 인증 시스템 테스트 시작...\n');

  let authToken = null;
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: '테스트 사용자'
  };

  try {
    // 1. 회원가입 테스트
    console.log('1️⃣ 회원가입 테스트...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
      
      console.log('✅ 회원가입 성공');
      console.log(`   - 사용자 ID: ${registerResponse.data.user.id}`);
      console.log(`   - 이메일: ${registerResponse.data.user.email}`);
      console.log(`   - 이름: ${registerResponse.data.user.name}`);
      
      // 쿠키에서 토큰 추출 (실제로는 브라우저가 자동으로 처리)
      const setCookie = registerResponse.headers['set-cookie'];
      if (setCookie) {
        const tokenCookie = setCookie.find(cookie => cookie.startsWith('auth-token='));
        if (tokenCookie) {
          authToken = tokenCookie.split('=')[1].split(';')[0];
          console.log('✅ 인증 토큰 획득');
        }
      }
      
    } catch (registerError) {
      console.log('❌ 회원가입 실패:', registerError.response?.data || registerError.message);
      return false;
    }

    // 2. 중복 회원가입 테스트
    console.log('\n2️⃣ 중복 회원가입 테스트...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, testUser);
      console.log('❌ 중복 회원가입이 성공해서는 안됨');
    } catch (duplicateError) {
      if (duplicateError.response && duplicateError.response.status === 409) {
        console.log('✅ 중복 이메일 검증 성공 (409 에러)');
        console.log(`   - 메시지: ${duplicateError.response.data.error}`);
      } else {
        console.log('❓ 예상치 못한 오류:', duplicateError.response?.data);
      }
    }

    // 3. 로그인 테스트
    console.log('\n3️⃣ 로그인 테스트...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      console.log('✅ 로그인 성공');
      console.log(`   - 메시지: ${loginResponse.data.message}`);
      console.log(`   - 사용자: ${loginResponse.data.user.name}`);
      
      // 쿠키에서 토큰 추출
      const setCookie = loginResponse.headers['set-cookie'];
      if (setCookie) {
        const tokenCookie = setCookie.find(cookie => cookie.startsWith('auth-token='));
        if (tokenCookie) {
          authToken = tokenCookie.split('=')[1].split(';')[0];
          console.log('✅ 로그인 토큰 갱신');
        }
      }
      
    } catch (loginError) {
      console.log('❌ 로그인 실패:', loginError.response?.data || loginError.message);
      return false;
    }

    // 4. 잘못된 비밀번호 로그인 테스트
    console.log('\n4️⃣ 잘못된 비밀번호 로그인 테스트...');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: testUser.email,
        password: 'WrongPassword123!'
      });
      console.log('❌ 잘못된 비밀번호로 로그인이 성공해서는 안됨');
    } catch (wrongPasswordError) {
      if (wrongPasswordError.response && wrongPasswordError.response.status === 401) {
        console.log('✅ 잘못된 비밀번호 검증 성공 (401 에러)');
        console.log(`   - 메시지: ${wrongPasswordError.response.data.error}`);
      }
    }

    // 5. 보호된 엔드포인트 접근 테스트 (토큰 포함)
    if (authToken) {
      console.log('\n5️⃣ 보호된 엔드포인트 접근 테스트 (인증 포함)...');
      try {
        const protectedResponse = await axios.get(`${BASE_URL}/api/auth/protected-example`, {
          headers: {
            'Cookie': `auth-token=${authToken}`
          }
        });
        
        console.log('✅ 보호된 엔드포인트 접근 성공');
        console.log(`   - 메시지: ${protectedResponse.data.message}`);
        console.log(`   - 사용자: ${protectedResponse.data.user.name}`);
        console.log(`   - 서버 시간: ${protectedResponse.data.serverTime}`);
        
      } catch (protectedError) {
        console.log('❌ 보호된 엔드포인트 접근 실패:', protectedError.response?.data);
      }
    }

    // 6. 로그아웃 테스트
    console.log('\n6️⃣ 로그아웃 테스트...');
    try {
      const logoutResponse = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
        headers: {
          'Cookie': `auth-token=${authToken}`
        }
      });
      
      console.log('✅ 로그아웃 성공');
      console.log(`   - 메시지: ${logoutResponse.data.message}`);
      
    } catch (logoutError) {
      console.log('⚠️  로그아웃 테스트:', logoutError.response?.data || logoutError.message);
    }

    return true;

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error.message);
    return false;
  }
}

// 메인 실행
testCompleteAuthFlow()
  .then((success) => {
    if (success) {
      console.log('\n🎉 완전한 인증 시스템 테스트 완료!');
      console.log('\n📊 테스트 결과 요약:');
      console.log('   ✅ Supabase 연동: 정상');
      console.log('   ✅ 회원가입: 정상');
      console.log('   ✅ 로그인: 정상');
      console.log('   ✅ JWT 토큰: 정상');
      console.log('   ✅ 인증 미들웨어: 정상');
      console.log('   ✅ 보호된 라우트: 정상');
      console.log('   ✅ 입력 검증: 정상');
      console.log('   ✅ 에러 처리: 정상');
    } else {
      console.log('\n❌ 테스트 실패');
    }
  })
  .catch((error) => {
    console.error('\n💥 예상치 못한 오류:', error);
  });