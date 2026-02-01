import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';

const WORKING_FILE = process.env.WORKING_FILE || '/home/seed/clawd-johnny/memory/WORKING.md';

// GET /api/memory/working - Read WORKING.md
export async function GET() {
  try {
    const content = await fs.readFile(WORKING_FILE, 'utf-8');
    return NextResponse.json({ content });
  } catch (err) {
    console.error('Error reading WORKING.md:', err);
    return NextResponse.json({ error: 'Failed to read WORKING.md' }, { status: 500 });
  }
}

// POST /api/memory/working - Update WORKING.md
export async function POST(request: NextRequest) {
  try {
    const { content, append } = await request.json();

    if (append) {
      const existing = await fs.readFile(WORKING_FILE, 'utf-8').catch(() => '');
      const updated = existing + '\n\n' + content;
      await fs.writeFile(WORKING_FILE, updated, 'utf-8');
    } else {
      await fs.writeFile(WORKING_FILE, content, 'utf-8');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error writing WORKING.md:', err);
    return NextResponse.json({ error: 'Failed to write WORKING.md' }, { status: 500 });
  }
}
