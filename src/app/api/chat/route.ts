import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

async function getPrompts() {
  const userPromptPath = path.join(process.cwd(), 'userPrompt.txt');
  const systemPromptPath = path.join(process.cwd(), 'systemPrompt.txt');
  
  let userPrompt = '';
  let systemPrompt = '';
  
  try {
    if (fs.existsSync(userPromptPath)) {
      userPrompt = fs.readFileSync(userPromptPath, 'utf-8').trim();
    }
  } catch (error) {
    console.warn('Failed to read userPrompt.txt:', error);
  }
  
  try {
    if (fs.existsSync(systemPromptPath)) {
      systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8').trim();
    }
  } catch (error) {
    console.warn('Failed to read systemPrompt.txt:', error);
  }
  
  return { userPrompt, systemPrompt };
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const { userPrompt, systemPrompt } = await getPrompts();
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not configured' }, { status: 500 });
    }

    const requestMessages = [];
    
    if (systemPrompt) {
      requestMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    requestMessages.push(...messages);

    if (userPrompt && requestMessages[requestMessages.length - 1]?.role === 'user') {
      const lastUserMessage = requestMessages[requestMessages.length - 1];
      lastUserMessage.content = `${lastUserMessage.content}`;
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: requestMessages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return NextResponse.json({ error: 'Failed to get response from DeepSeek' }, { status: response.status });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  console.warn('Failed to parse chunk:', data);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}