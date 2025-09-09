import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

interface DashScopeResponse {
  output?: {
    text?: string;
  };
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-7146f670a47345dfbacf59911d7c39d0';
    const appId = process.env.DASHSCOPE_APP_ID || 'ef0763ab3d264fd785b4640e60cae96d';
    
    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const prompt = lastUserMessage?.content || '你好';

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    const data = {
      input: {
        prompt: prompt
      },
      parameters: {},
      debug: {}
    };

    console.log('Calling DashScope API:', url);
    console.log('Request data:', JSON.stringify(data));
    
    // Use node-fetch which might handle the API better
    console.log('Using node-fetch to call DashScope API');
    
    try {
      const fetch = (await import('node-fetch')).default;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Node.js'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Node-fetch response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DashScope API error response:', errorText);
        
        const requestId = response.headers.get('x-request-id');
        
        return NextResponse.json({ 
          error: 'Failed to get response from DashScope',
          status: response.status,
          request_id: requestId,
          details: errorText 
        }, { status: response.status });
      }

      const responseData: DashScopeResponse = await response.json() as DashScopeResponse;
      console.log('DashScope API success response:', responseData);
      
      if (responseData.output && responseData.output.text) {
        return NextResponse.json({
          content: responseData.output.text
        });
      } else {
        return NextResponse.json({
          error: 'No text output from DashScope',
          response: responseData
        }, { status: 500 });
      }
      
    } catch (error: any) {
      console.error('Node-fetch error calling DashScope:', error.message, error.name);
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'DashScope API request timed out',
          message: 'The API did not respond within 10 seconds'
        }, { status: 504 });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}