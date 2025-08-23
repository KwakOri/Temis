import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const settingKey = url.searchParams.get('key');

    let query = supabase
      .from('admin_settings')
      .select('*')
      .eq('is_active', true);

    if (settingKey) {
      query = query.eq('setting_key', settingKey);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    if (settingKey && data.length === 0) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // If specific key requested, return single setting
    if (settingKey) {
      return NextResponse.json({
        success: true,
        setting: data[0]
      });
    }

    // Return all settings
    return NextResponse.json({
      success: true,
      settings: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { setting_key, setting_value, description, category, is_active } = body;

    if (!setting_key || !setting_value) {
      return NextResponse.json(
        { error: 'Missing required fields: setting_key and setting_value' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('admin_settings')
      .update({
        setting_value,
        description,
        category,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', setting_key)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      setting: data[0]
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}