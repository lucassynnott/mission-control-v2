import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

const MEMORY_DIR = process.env.MEMORY_DIR || '/home/seed/clawd-johnny/memory';

// GET /api/memory/daily?date=YYYY-MM-DD - Read daily note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const filePath = join(MEMORY_DIR, `${date}.md`);

    const content = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json({ date, content });
  } catch (err) {
    console.error('Error reading daily note:', err);
    return NextResponse.json({ error: 'Daily note not found' }, { status: 404 });
  }
}

// POST /api/memory/daily - Append to daily note
export async function POST(request: NextRequest) {
  try {
    const { date, entry } = await request.json();
    const noteDate = date || new Date().toISOString().split('T')[0];
    const filePath = join(MEMORY_DIR, `${noteDate}.md`);

    await fs.mkdir(MEMORY_DIR, { recursive: true });

    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      content = `# Daily Notes: ${noteDate}\n\n`;
    }

    const timestamp = new Date().toISOString();
    const newEntry = `## ${timestamp}\n\n${entry}\n\n`;
    content += newEntry;

    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, date: noteDate });
  } catch (err) {
    console.error('Error writing daily note:', err);
    return NextResponse.json({ error: 'Failed to write daily note' }, { status: 500 });
  }
}
