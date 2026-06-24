import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildChatSystemPrompt } from '@/lib/botPrompts';
import { ResponseStep } from '@/lib/aiResponses';
import { Condition } from '@/lib/conditions';
import {
  generateAcknowledgment,
  isClearlyOffTopic,
  validateChatInput,
} from '@/lib/aiResponses';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  step: ResponseStep;
  question: string;
  userInput: string;
  condition: Pick<
    Condition,
    | 'conditionId'
    | 'botName'
    | 'anthropomorphism'
    | 'proactivity'
    | 'explainability'
    | 'twoSidedMessage'
    | 'tone'
    | 'avatarType'
  >;
}

interface ChatResponseBody {
  relevant: boolean;
  reply: string;
  source: 'openai' | 'fallback';
}

function parseModelJson(content: string): { relevant: boolean; reply: string } | null {
  try {
    const parsed = JSON.parse(content) as { relevant?: boolean; reply?: string };
    if (typeof parsed.relevant !== 'boolean' || typeof parsed.reply !== 'string') {
      return null;
    }
    const reply = parsed.reply.trim();
    if (!reply) return null;
    return { relevant: parsed.relevant, reply };
  } catch {
    return null;
  }
}

function buildFallbackResponse(
  step: ResponseStep,
  userInput: string,
  condition: ChatRequestBody['condition'],
): ChatResponseBody {
  const validation = validateChatInput(step, userInput, condition as Condition);
  if (!validation.valid) {
    return {
      relevant: false,
      reply: validation.rejectionMessage ?? '請輸入與面試穿搭相關的回答。',
      source: 'fallback',
    };
  }

  return {
    relevant: true,
    reply: generateAcknowledgment(step, userInput, condition as Condition),
    source: 'fallback',
  };
}

export async function POST(request: NextRequest) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: '無效的 JSON 資料' }, { status: 400 });
  }

  const { step, question, userInput, condition } = body;
  const trimmedInput = userInput?.trim() ?? '';

  if (!step || !question || !trimmedInput || !condition) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
  }

  if (isClearlyOffTopic(trimmedInput)) {
    const fallback = buildFallbackResponse(step, trimmedInput, condition);
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = buildFallbackResponse(step, trimmedInput, condition);
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const systemPrompt = buildChatSystemPrompt({ condition: condition as Condition, step, question });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `使用者回答：${trimmedInput}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = parseModelJson(content);

    if (!parsed) {
      const fallback = buildFallbackResponse(step, trimmedInput, condition);
      return NextResponse.json(fallback satisfies ChatResponseBody);
    }

    if (!parsed.relevant && !isClearlyOffTopic(trimmedInput)) {
      return NextResponse.json({
        relevant: true,
        reply: generateAcknowledgment(step, trimmedInput, condition as Condition),
        source: 'fallback',
      } satisfies ChatResponseBody);
    }

    return NextResponse.json({
      relevant: parsed.relevant,
      reply: parsed.reply,
      source: 'openai',
    } satisfies ChatResponseBody);
  } catch (error) {
    console.error('OpenAI chat API failed:', error);
    const fallback = buildFallbackResponse(step, trimmedInput, condition);
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }
}
