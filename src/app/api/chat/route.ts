import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildChatSystemPrompt, buildFreeChatSystemPrompt } from '@/lib/botPrompts';
import { ResponseStep, generateFreeChatFallbackReply } from '@/lib/aiResponses';
import { Condition } from '@/lib/conditions';
import { ExperimentChatContext, buildExperimentKnowledgeBlock } from '@/lib/experimentKnowledge';
import {
  CatalogCorrectionRule,
  catalogColorListReply,
  catalogCorrectionReply,
  detectFalseUnavailableCatalogClaim,
} from '@/lib/catalogBoundaries';
import { ReplySource } from '@/lib/replySource';
import {
  generateAcknowledgment,
  getDeterministicAcknowledgment,
  hasOutfitRelevanceSignal,
  isClearlyOffTopic,
  validateChatInput,
} from '@/lib/aiResponses';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  step: ResponseStep;
  question: string;
  userInput: string;
  conversationHistory?: Array<{ sender: 'user' | 'bot'; message: string }>;
  canRevealFinalRecommendation?: boolean;
  experimentContext?: ExperimentChatContext;
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
  /** 受試者實際看到的這則回覆來自哪裡；只供資料紀錄。 */
  replySource: ReplySource;
  /** 庫存更正時：觸發的規則，以及被換掉的原回覆與其來源。 */
  catalogCorrectionRule?: CatalogCorrectionRule;
  replacedReply?: string;
  replacedReplySource?: ReplySource;
}

function parseModelJson(content: string): { relevant: boolean; reply: string } | null {
  try {
    const parsed = JSON.parse(content) as { relevant?: boolean; reply?: string };
    if (typeof parsed.reply !== 'string') {
      return null;
    }
    const reply = parsed.reply.trim();
    if (!reply) return null;
    return {
      relevant: typeof parsed.relevant === 'boolean' ? parsed.relevant : true,
      reply,
    };
  } catch {
    return null;
  }
}

function buildGuidedFallbackResponse(
  step: ResponseStep,
  userInput: string,
  condition: ChatRequestBody['condition'],
  replySource: ReplySource,
): ChatResponseBody {
  const validation = validateChatInput(step, userInput, condition as Condition);
  if (!validation.valid) {
    return {
      relevant: false,
      reply: validation.rejectionMessage ?? '請輸入與面試穿搭相關的回答。',
      source: 'fallback',
      replySource,
    };
  }

  return {
    relevant: true,
    reply: generateAcknowledgment(step, userInput, condition as Condition),
    source: 'fallback',
    replySource,
  };
}

async function handleFreeChat(
  trimmedInput: string,
  conversationHistory: Array<{ sender: 'user' | 'bot'; message: string }>,
  condition: ChatRequestBody['condition'],
  canRevealFinalRecommendation: boolean,
  experimentContext?: ExperimentChatContext,
): Promise<ChatResponseBody> {
  const experimentKnowledge = experimentContext
    ? buildExperimentKnowledgeBlock(experimentContext, condition)
    : '';

  const withCatalogGuard = (reply: string, replySource: ReplySource): ChatResponseBody => {
    const source = replySource === 'gpt' ? 'openai' : 'fallback';
    const rule = detectFalseUnavailableCatalogClaim(reply, trimmedInput);
    if (!rule) {
      return { relevant: true, reply, source, replySource };
    }
    return {
      relevant: true,
      reply: catalogCorrectionReply(rule, condition.anthropomorphism),
      source,
      replySource: 'catalog_correction',
      catalogCorrectionRule: rule,
      replacedReply: reply,
      replacedReplySource: replySource,
    };
  };

  const backupReply = (replySource: ReplySource): ChatResponseBody =>
    withCatalogGuard(
      generateFreeChatFallbackReply(
        trimmedInput,
        condition as Condition,
        experimentContext,
        conversationHistory,
      ),
      replySource,
    );

  // 詢問現有色系：直接回完整清單，避免模型漏列深棕／棕色
  if (/還有什麼.*色|有哪些.*色|什麼.*顏色|商品顏色|現有.*色系|顏色有哪些/.test(trimmedInput)) {
    return {
      relevant: true,
      reply: catalogColorListReply(condition.anthropomorphism),
      source: 'fallback',
      replySource: 'color_shortcut',
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return backupReply('missing_api_key');
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const systemPrompt = buildFreeChatSystemPrompt({
      condition: condition as Condition,
      canRevealFinalRecommendation,
      experimentKnowledge,
    });

    const completion = await client.chat.completions.create({
      model,
      // 實驗操弄需穩定重現，降低隨機發揮造成的 High/Low bleed。
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-12).map((entry) => ({
          role: entry.sender === 'bot' ? ('assistant' as const) : ('user' as const),
          content: entry.message,
        })),
        {
          role: 'user',
          content: trimmedInput,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = parseModelJson(content);

    if (!parsed) {
      return backupReply('parse_error');
    }

    return withCatalogGuard(parsed.reply, 'gpt');
  } catch (error) {
    console.error('OpenAI free chat API failed:', error);
    return backupReply('api_error');
  }
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
  const canRevealFinalRecommendation = body.canRevealFinalRecommendation ?? false;
  const conversationHistory = body.conversationHistory ?? [];

  if (!step || !question || !trimmedInput || !condition) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
  }

  if (step === 'freeChat') {
    const response = await handleFreeChat(
      trimmedInput,
      conversationHistory,
      condition,
      canRevealFinalRecommendation,
      body.experimentContext,
    );
    return NextResponse.json(response satisfies ChatResponseBody);
  }

  if (isClearlyOffTopic(trimmedInput)) {
    const fallback = buildGuidedFallbackResponse(step, trimmedInput, condition, 'program_fixed');
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }

  const deterministic = getDeterministicAcknowledgment(step, trimmedInput, condition as Condition);
  if (deterministic) {
    return NextResponse.json({
      relevant: true,
      reply: deterministic,
      source: 'fallback',
      replySource: 'program_fixed',
    } satisfies ChatResponseBody);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = buildGuidedFallbackResponse(step, trimmedInput, condition, 'missing_api_key');
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const systemPrompt = buildChatSystemPrompt({
      condition: condition as Condition,
      step,
      question,
      canRevealFinalRecommendation,
    });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10).map((entry) => ({
          role: entry.sender === 'bot' ? ('assistant' as const) : ('user' as const),
          content: entry.message,
        })),
        {
          role: 'user',
          content: `使用者最新輸入：${trimmedInput}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = parseModelJson(content);

    if (!parsed) {
      const fallback = buildGuidedFallbackResponse(step, trimmedInput, condition, 'parse_error');
      return NextResponse.json(fallback satisfies ChatResponseBody);
    }

    if (!parsed.relevant && hasOutfitRelevanceSignal(step, trimmedInput)) {
      return NextResponse.json({
        relevant: true,
        reply: generateAcknowledgment(step, trimmedInput, condition as Condition),
        source: 'fallback',
        replySource: 'program_fixed',
      } satisfies ChatResponseBody);
    }

    const deterministicAfterAi = getDeterministicAcknowledgment(
      step,
      trimmedInput,
      condition as Condition,
    );
    if (parsed.relevant && deterministicAfterAi) {
      return NextResponse.json({
        relevant: true,
        reply: deterministicAfterAi,
        source: 'fallback',
        replySource: 'program_fixed',
      } satisfies ChatResponseBody);
    }

    return NextResponse.json({
      relevant: parsed.relevant,
      reply: parsed.reply,
      source: 'openai',
      replySource: 'gpt',
    } satisfies ChatResponseBody);
  } catch (error) {
    console.error('OpenAI chat API failed:', error);
    const fallback = buildGuidedFallbackResponse(step, trimmedInput, condition, 'api_error');
    return NextResponse.json(fallback satisfies ChatResponseBody);
  }
}
