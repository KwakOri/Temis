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

async function testTemplatesQuery() {
  console.log('Testing direct Supabase connection...');
  
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return;
    }

    console.log('Success! Found templates:', templates?.length || 0);
    console.log('Templates data:', JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error('Connection error:', error);
  }
}

testTemplatesQuery();