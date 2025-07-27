// Supabase 연결 테스트 스크립트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🧪 Supabase 연결 테스트 시작...\n');

  // 환경 변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 환경 변수 확인:');
  console.log(`  - SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 누락'}`);
  console.log(`  - SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ 설정됨' : '❌ 누락'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  // Supabase 클라이언트 생성
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  console.log('🔌 Supabase 클라이언트 연결 테스트...');

  try {
    // 1. 기본 연결 테스트
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️  users 테이블이 존재하지 않습니다.');
        console.log('   SQL 스키마를 먼저 실행해주세요: supabase-schema.sql\n');
        return false;
      } else {
        throw error;
      }
    }

    console.log('✅ Supabase 연결 성공!');
    console.log('✅ users 테이블 접근 가능');
    console.log(`📊 테이블 데이터 수: ${data.length}개\n`);

    // 2. 테이블 구조 확인
    console.log('🔍 users 테이블 구조 확인...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
      .limit(1);

    if (tableError && tableError.code !== '42883') {
      console.log('ℹ️  테이블 구조 확인 함수가 없습니다. (정상)');
    }

    // 3. 샘플 데이터 조회 (있는 경우)
    if (data.length > 0) {
      console.log('📋 샘플 데이터:');
      data.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.name})`);
      });
    } else {
      console.log('📋 테이블이 비어있습니다.');
    }

    return true;

  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error.message);
    console.error('상세 오류:', error);
    return false;
  }
}

// 메인 실행
testSupabaseConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 모든 테스트 통과!');
      process.exit(0);
    } else {
      console.log('\n❌ 테스트 실패');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 예상치 못한 오류:', error);
    process.exit(1);
  });