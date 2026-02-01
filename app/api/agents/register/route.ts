import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, model, avatar_emoji } = body;

    if (!name || !role || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, role, model' },
        { status: 400 }
      );
    }

    // Generate unique session key
    const sessionKey = `agent:${name.toLowerCase().replace(/\s+/g, '-')}:${Date.now()}`;

    const { data, error } = await supabase
      .from('agents')
      .insert({
        name,
        role,
        model,
        session_key: sessionKey,
        avatar_emoji: avatar_emoji || '🤖',
        status: 'idle',
        tokens_used: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
