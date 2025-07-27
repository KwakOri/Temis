// Supabase 데이터베이스 설정 스크립트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🛠️  Supabase 데이터베이스 설정 시작...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  try {
    console.log('📋 users 테이블 생성 중...');

    // 1. users 테이블 생성
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', { 
      query: createTableQuery 
    });

    if (tableError) {
      console.log('⚠️  RPC 함수를 사용할 수 없습니다.');
      console.log('   Supabase 대시보드의 SQL Editor에서 다음 SQL을 직접 실행해주세요:');
      console.log('   ' + '='.repeat(60));
      console.log(createTableQuery);
      console.log('   ' + '='.repeat(60));
      return false;
    }

    console.log('✅ users 테이블 생성 완료');

    // 2. 인덱스 생성
    console.log('📋 인덱스 생성 중...');
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;

    await supabase.rpc('exec_sql', { query: createIndexQuery });
    console.log('✅ 이메일 인덱스 생성 완료');

    // 3. 트리거 함수 생성
    console.log('📋 트리거 함수 생성 중...');
    const createTriggerFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    await supabase.rpc('exec_sql', { query: createTriggerFunctionQuery });
    console.log('✅ 트리거 함수 생성 완료');

    // 4. 트리거 생성
    console.log('📋 트리거 생성 중...');
    const createTriggerQuery = `
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;

    await supabase.rpc('exec_sql', { query: createTriggerQuery });
    console.log('✅ 업데이트 트리거 생성 완료');

    // 5. 테스트 데이터 삽입
    console.log('📋 테스트 데이터 삽입 중...');
    const insertTestDataQuery = `
      INSERT INTO users (email, name, password) VALUES
        ('admin@example.com', '관리자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK'),
        ('user@example.com', '사용자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK')
      ON CONFLICT (email) DO NOTHING;
    `;

    await supabase.rpc('exec_sql', { query: insertTestDataQuery });
    console.log('✅ 테스트 데이터 삽입 완료');

    return true;

  } catch (error) {
    console.error('❌ 데이터베이스 설정 실패:', error.message);
    return false;
  }
}

// 메인 실행
setupDatabase()
  .then((success) => {
    if (success) {
      console.log('\n🎉 데이터베이스 설정 완료!');
      console.log('이제 test-supabase.js를 다시 실행해보세요.');
    } else {
      console.log('\n❌ 데이터베이스 설정 실패');
      console.log('Supabase 대시보드에서 SQL을 직접 실행해주세요.');
    }
  })
  .catch((error) => {
    console.error('\n💥 예상치 못한 오류:', error);
  });