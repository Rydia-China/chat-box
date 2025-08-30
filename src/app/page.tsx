'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_PROMPTS = [
  `你好，欢迎来到这个独特的占卜空间。在这里，我们将运用古老的梅花易数，结合现代大数据分析、马克思主义的唯物辩证法以及中国传统文化智慧，为你解读当下的困惑，并预测未来的趋势。

为了开始，请你告诉我两件事：

三个数字：请随意说出你心中想到的3个数字，需要分开输入，每个数字都用空格隔开

一个占卜内容：你想占卜什么事情？比如：事业发展、感情走向、学业前景，或是一个具体问题的答案。

准备好了吗？请告诉我你的数字和占卜内容吧。`,
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';

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
                setIsLoading(false);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;

                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = { role: 'assistant', content: assistantContent };
                    } else {
                      updated.push({ role: 'assistant', content: assistantContent });
                    }
                    return updated;
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    setShowPrompts(false);
  };

  return (
    <div
      className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 relative"
      style={{
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Enhanced overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 dark:from-black/50 dark:via-black/30 dark:to-black/60"></div>

      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-white mt-12 mb-8">
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 mx-4 border border-white/20 shadow-2xl">
                <h1 className="text-5xl font-bold mb-6 drop-shadow-2xl bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  易璇AI
                </h1>
                <div className="text-lg leading-relaxed drop-shadow-lg bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <p className="whitespace-pre-line">{DEFAULT_PROMPTS[0]}</p>
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`max-w-lg lg:max-w-2xl px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm border ${message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/30 shadow-blue-500/25'
                    : 'bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 border-white/30 dark:border-gray-700/50'
                  }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm border">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm border">
                              {children}
                            </code>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white/95 dark:bg-gray-800/95 border border-white/30 rounded-2xl px-5 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">正在思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced input area */}
      <div className="border-t border-white/20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 relative z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {showPrompts && messages.length > 0 && (
            <div className="mb-6 p-5 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                引导词建议：
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEFAULT_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="text-left text-sm p-3 bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-500 hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3 items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题或提供占卜信息..."
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white shadow-sm transition-all duration-200 min-h-[44px] max-h-32"
              rows={1}
              disabled={isLoading}
              style={{
                lineHeight: '1.5',
                fontSize: '16px'
              }}
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/25 font-medium min-w-[80px] flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                '发送'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
