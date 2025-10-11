/**
 * Purchase Requests Migration Script
 *
 * This script migrates data from 'purchase_requests' table to 'template_purchase_requests' table
 *
 * Requirements:
 * 1. template_purchase_requests table must have plan_id column added
 * 2. Run this script with: node scripts/migrate-purchase-requests.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    }
  });
}

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default plan_id to use for all migrated records
const DEFAULT_PLAN_ID = '54bc7f78-8671-4275-b849-f5ae013646d8';

/**
 * Find user_id by email
 */
async function findUserIdByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error) {
    console.warn(`⚠️  User not found for email: ${email}`);
    return null;
  }

  return data.id;
}

/**
 * Migrate a single purchase request
 */
async function migratePurchaseRequest(oldRequest) {
  try {
    // Find user_id by email
    const userId = await findUserIdByEmail(oldRequest.email);

    if (!userId) {
      console.error(`❌ Skipping request ${oldRequest.id}: User not found for email ${oldRequest.email}`);
      return { success: false, reason: 'user_not_found' };
    }

    // Prepare new record
    const newRequest = {
      id: oldRequest.id, // Keep the same ID
      user_id: userId,
      template_id: oldRequest.template_id,
      plan_id: DEFAULT_PLAN_ID,
      depositor_name: oldRequest.depositor_name,
      status: oldRequest.status,
      created_at: oldRequest.created_at,
      updated_at: oldRequest.updated_at,
    };

    // Insert into template_purchase_requests
    const { error } = await supabase
      .from('template_purchase_requests')
      .insert(newRequest);

    if (error) {
      console.error(`❌ Failed to migrate request ${oldRequest.id}:`, error.message);
      return { success: false, reason: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error migrating request ${oldRequest.id}:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting purchase requests migration...\n');

  try {
    // Fetch all records from old table
    console.log('📥 Fetching records from purchase_requests table...');
    const { data: oldRequests, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch old records: ${fetchError.message}`);
    }

    console.log(`✅ Found ${oldRequests.length} records to migrate\n`);

    if (oldRequests.length === 0) {
      console.log('✅ No records to migrate. Exiting...');
      return;
    }

    // Migrate each record
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < oldRequests.length; i++) {
      const request = oldRequests[i];
      console.log(`[${i + 1}/${oldRequests.length}] Migrating request ${request.id} (${request.email})...`);

      const result = await migratePurchaseRequest(request);

      if (result.success) {
        results.success++;
        console.log(`  ✅ Success`);
      } else {
        results.failed++;
        results.errors.push({
          id: request.id,
          email: request.email,
          reason: result.reason
        });
        console.log(`  ❌ Failed: ${result.reason}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${results.success}`);
    console.log(`❌ Failed to migrate: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Failed records:');
      results.errors.forEach(err => {
        console.log(`  - ID: ${err.id}, Email: ${err.email}, Reason: ${err.reason}`);
      });
    }

    console.log('\n' + '='.repeat(50));

    if (results.failed === 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Verify the data in template_purchase_requests table');
      console.log('2. Update application code to use new table structure');
      console.log('3. Test the application thoroughly');
      console.log('4. (Optional) Drop the old plan column after verification');
    } else {
      console.log('⚠️  Migration completed with errors. Please review failed records.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script error:', error);
    process.exit(1);
  });
