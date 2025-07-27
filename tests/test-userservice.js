// UserService 테스트 스크립트
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// UserService 클래스 (테스트용)
class UserService {
  static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );

  static async findByEmail(email) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      throw new Error('사용자 조회 중 오류가 발생했습니다.');
    }
  }

  static async create(userData) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      throw new Error('사용자 생성 중 오류가 발생했습니다.');
    }
  }

  static async emailExists(email) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (error) {
        throw error;
      }
      return data.length > 0;
    } catch (error) {
      throw new Error('이메일 중복 확인 중 오류가 발생했습니다.');
    }
  }
}

async function testUserService() {
  console.log('🧪 UserService 테스트 시작...\n');

  try {
    // 1. 테이블 존재 확인
    console.log('1️⃣ 테이블 접근 테스트...');
    const { data: tableCheck, error: tableError } = await UserService.supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('❌ users 테이블이 존재하지 않습니다.');
        console.log('   먼저 Supabase 대시보드에서 다음 SQL을 실행해주세요:');
        console.log('   ' + '='.repeat(60));
        console.log(`
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

INSERT INTO users (email, name, password) VALUES
  ('admin@example.com', '관리자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK'),
  ('user@example.com', '사용자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK')
ON CONFLICT (email) DO NOTHING;
        `);
        console.log('   ' + '='.repeat(60));
        return false;
      }
      throw tableError;
    }

    console.log('✅ users 테이블 접근 성공');
    console.log(`📊 현재 데이터 수: ${tableCheck.length}개\n`);

    // 2. 이메일 조회 테스트
    console.log('2️⃣ 이메일 조회 테스트...');
    const existingUser = await UserService.findByEmail('admin@example.com');
    if (existingUser) {
      console.log('✅ 기존 사용자 조회 성공');
      console.log(`   - 이름: ${existingUser.name}`);
      console.log(`   - 이메일: ${existingUser.email}`);
    } else {
      console.log('⚠️  기존 사용자가 없습니다.');
    }

    const nonExistingUser = await UserService.findByEmail('nonexistent@example.com');
    console.log(`✅ 존재하지 않는 사용자 조회: ${nonExistingUser ? '실패' : '성공'}\n`);

    // 3. 이메일 중복 확인 테스트
    console.log('3️⃣ 이메일 중복 확인 테스트...');
    const emailExists1 = await UserService.emailExists('admin@example.com');
    const emailExists2 = await UserService.emailExists('newuser@example.com');
    console.log(`✅ 기존 이메일 중복 확인: ${emailExists1 ? '중복됨' : '사용가능'}`);
    console.log(`✅ 새 이메일 중복 확인: ${emailExists2 ? '중복됨' : '사용가능'}\n`);

    // 4. 새 사용자 생성 테스트
    console.log('4️⃣ 새 사용자 생성 테스트...');
    const testEmail = `test_${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    
    try {
      const newUser = await UserService.create({
        email: testEmail,
        name: '테스트 사용자',
        password: hashedPassword
      });
      
      console.log('✅ 새 사용자 생성 성공');
      console.log(`   - ID: ${newUser.id}`);
      console.log(`   - 이름: ${newUser.name}`);
      console.log(`   - 이메일: ${newUser.email}`);
      console.log(`   - 생성일: ${newUser.created_at}\n`);
    } catch (createError) {
      console.log('❌ 사용자 생성 실패:', createError.message);
    }

    return true;

  } catch (error) {
    console.error('❌ UserService 테스트 실패:', error.message);
    console.error('상세 오류:', error);
    return false;
  }
}

// 메인 실행
testUserService()
  .then((success) => {
    if (success) {
      console.log('🎉 UserService 테스트 완료!');
    } else {
      console.log('❌ UserService 테스트 실패');
    }
  })
  .catch((error) => {
    console.error('💥 예상치 못한 오류:', error);
  });