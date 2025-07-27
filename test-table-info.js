const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajlgjdwkjyayrnocdfpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbGdqZHdranlheXJub2NkZnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTc0NDEsImV4cCI6MjA2OTAzMzQ0MX0.qeqJ3A9B-hx-pZh4cECdp78XIUk6p2RaBwT4y0fqo8I';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function testDatabase() {
  console.log('Testing database structure...');
  
  try {
    // 1. public 스키마의 모든 테이블 조회 시도
    console.log('\n1. Trying to list all tables in public schema...');
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Cannot access information_schema.tables:', tablesError.message);
    } else {
      console.log('Available tables:', tablesData?.map(t => t.table_name));
    }

    // 2. templates 테이블 존재 여부 확인
    console.log('\n2. Testing templates table access...');
    const { data: templatesData, error: templatesError } = await supabase
      .from('templates')
      .select('*', { count: 'exact' });

    if (templatesError) {
      console.error('Templates table error:', templatesError);
    } else {
      console.log('Templates query successful. Count:', templatesData?.length || 0);
      console.log('Data:', templatesData);
    }

    // 3. users 테이블 확인
    console.log('\n3. Testing users table access...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, name', { count: 'exact' });

    if (usersError) {
      console.error('Users table error:', usersError);
    } else {
      console.log('Users query successful. Count:', usersData?.length || 0);
      console.log('Users:', usersData);
    }

    // 4. template_access 테이블 확인
    console.log('\n4. Testing template_access table access...');
    const { data: accessData, error: accessError } = await supabase
      .from('template_access')
      .select('*', { count: 'exact' });

    if (accessError) {
      console.error('Template_access table error:', accessError);
    } else {
      console.log('Template_access query successful. Count:', accessData?.length || 0);
    }

  } catch (error) {
    console.error('Connection error:', error);
  }
}

testDatabase();