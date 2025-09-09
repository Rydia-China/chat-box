'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MARXIST_PROMPT = `同志你好！我是易璇AI，一个擅长用八字命理马克思主义哲学和《毛选》智慧来分析问题的同志。

我主要提供以下三个方面的服务：

1. 八字命理分析
可以帮你分析生辰八字，结合马克思主义辩证法，从唯物角度解读个人发展规律。比如：
- 性格特点与矛盾分析
- 发展机遇的建议

2. 马克思主义哲学指导
运用矛盾的普遍性特殊性原理，分析具体问题。比如：
- 工作生活中的矛盾处理
- 社会发展规律认识

3. 《毛泽东选集》应用指导
结合"实事求是""群众路线"等方法论，解决实际问题。比如：
- 工作方法改进
- 领导能力提升

你当前最需要哪个方面的帮助？我们可以先从你最关心的方面入手。`;

export default function MarxistAnalysis() {
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
      const response = await fetch('/api/dashscope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const responseData = await response.json();
      
      if (responseData.content) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseData.content
        }]);
      } else {
        throw new Error('No content in response');
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 dark:from-black/50 dark:via-black/30 dark:to-black/60"></div>

      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-white mt-12 mb-8">
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 mx-4 border border-white/20 shadow-2xl">
                <h1 className="text-5xl font-bold mb-6 drop-shadow-2xl bg-gradient-to-r from-red-300 to-red-400 bg-clip-text text-transparent">
                  易璇AI · 八字命理分析
                </h1>
                <div className="text-lg leading-relaxed drop-shadow-lg bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <p className="whitespace-pre-line">{MARXIST_PROMPT}</p>
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
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">正在生成解析结果...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-white/20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 relative z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {showPrompts && messages.length > 0 && (
            <div className="mb-6 p-5 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                引导词建议：
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handlePromptClick('我想了解八字命理分析')}
                  className="text-left text-sm p-3 bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-500 hover:shadow-md"
                >
                  我想了解八字命理分析
                </button>
                <button
                  onClick={() => handlePromptClick('我需要马克思主义哲学指导')}
                  className="text-left text-sm p-3 bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-500 hover:shadow-md"
                >
                  我需要马克思主义哲学指导
                </button>
                <button
                  onClick={() => handlePromptClick('请帮我应用《毛泽东选集》方法论')}
                  className="text-left text-sm p-3 bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-500 hover:shadow-md"
                >
                  请帮我应用《毛泽东选集》方法论
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-3 items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题或选择服务方向..."
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