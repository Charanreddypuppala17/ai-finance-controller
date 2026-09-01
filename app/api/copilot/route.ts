import { NextResponse } from 'next/server';
import { processCopilotMessage } from '@/ai/agent';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user-001';
    const { prompt, runId } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { reply, toolExecutions } = await processCopilotMessage(userId, prompt, runId);

    return NextResponse.json({
      success: true,
      reply,
      toolExecutions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Copilot execution error' }, { status: 500 });
  }
}
