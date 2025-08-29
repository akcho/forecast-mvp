import { useState, useRef, useEffect, useCallback } from 'react';
import { getSessionId, setSessionId } from '@/lib/session';
import { Text, Button } from '@tremor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LoadingState } from '@/components/LoadingSpinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatPanelProps {
  initialInput?: string;
  onInputChange?: (value: string) => void;
  currentReports?: {
    profitLoss?: any;
    balanceSheet?: any;
    cashFlow?: any;
  };
  timePeriod?: string;
}

export default function ChatPanel({ 
  initialInput = '', 
  onInputChange,
  currentReports,
  timePeriod = '3months'
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialInput);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>(''); // Track streaming content
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false); // Prevent multiple API calls
  
  // Debounced streaming update to prevent stuttering
  const updateStreamingContent = useCallback((messageIndex: number, content: string) => {
    // Update the ref immediately
    streamingContentRef.current = content;
    
    // Use requestAnimationFrame to batch updates and prevent stuttering
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = requestAnimationFrame(() => {
        setMessages((prev) => {
          const newMessages = [...prev];
          if (newMessages[messageIndex]) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: streamingContentRef.current,
              isStreaming: true
            };
          }
          return newMessages;
        });
        updateTimeoutRef.current = null;
      });
    }
  }, []);
  
  // Final update when streaming ends
  const finalizeMessage = useCallback((messageIndex: number, content: string) => {
    // Cancel any pending animation frame
    if (updateTimeoutRef.current) {
      cancelAnimationFrame(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    setMessages((prev) => {
      const newMessages = [...prev];
      if (newMessages[messageIndex]) {
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          content,
          isStreaming: false
        };
      }
      return newMessages;
    });
  }, []);

  useEffect(() => {
    setInputValue(initialInput);
  }, [initialInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    setLoading(true);

    const newMessage: Message = {
      role: 'user',
      content: message,
    };

    // Add user message first
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    onInputChange?.('');

    // Add AI placeholder message and get its index
    let aiMessageIndex: number;
    setMessages((prev) => {
      aiMessageIndex = prev.length;
      return [...prev, {
        role: 'assistant',
        content: '',
        isStreaming: true
      }];
    });

    // Make API call after state update using requestAnimationFrame to ensure state is committed
    requestAnimationFrame(async () => {
      try {
        console.log('🔍 CLIENT: Making chat API request', {
          message,
          currentReports: currentReports ? 'provided' : 'missing',
          timePeriod,
          sessionId: getSessionId()
        });
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId() || '',
          },
          body: JSON.stringify({
            message: message,
            currentReports: currentReports,
            timePeriod: timePeriod,
            stream: true, // Re-enable streaming
          }),
        });

        console.log('🔍 CLIENT: Chat API response', {
          status: response.status,
          contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is streaming
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/plain')) {
          // Handle streaming response
          await handleStreamingResponse(response, aiMessageIndex);
        } else {
          // Handle regular JSON response (fallback)
          const data = await response.json();
          handleRegularResponse(data, aiMessageIndex);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages((prev) => {
          const newMessages = [...prev];
          if (newMessages[aiMessageIndex]) {
            newMessages[aiMessageIndex] = {
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false
            };
          }
          return newMessages;
        });
      } finally {
        setLoading(false);
        isProcessingRef.current = false;
      }
    });
  };

  const handleStreamingResponse = async (response: Response, messageIndex: number) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let sessionId: string | null = null;
    let buffer = '';
    let accumulatedContent = '';
    
    // Reset the streaming content ref for this new response
    streamingContentRef.current = '';

    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines - proper SSE parsing
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // Proper SSE parsing - strip data: prefix
          if (line.startsWith('data: ')) {
            try {
              const message = line.replace(/^data: /, "");
              if (message.trim() === '') continue;
              
              const data = JSON.parse(message);
              
              switch (data.type) {
                case 'session':
                  sessionId = data.sessionId;
                  if (sessionId) {
                    setSessionId(sessionId);
                  }
                  break;
                case 'chunk':
                  // Direct accumulation - no queue needed since we're processing in order
                  accumulatedContent += data.content;
                  streamingContentRef.current = accumulatedContent;
                  
                  // Use efficient streaming update to prevent flashing
                  updateStreamingContent(messageIndex, accumulatedContent);
                  break;
                case 'end':
                  finalizeMessage(messageIndex, accumulatedContent);
                  return;
                case 'error':
                  throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError, 'Line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleRegularResponse = (data: any, messageIndex: number) => {
    if (data.sessionId) {
      setSessionId(data.sessionId);
    }

    if (data.type === 'auth_required') {
      setMessages((prev) => {
        const newMessages = [...prev];
        if (newMessages[messageIndex]) {
          newMessages[messageIndex] = {
            role: 'assistant',
            content: data.message,
            isStreaming: false
          };
        }
        return newMessages;
      });
      return;
    }

    setMessages((prev) => {
      const newMessages = [...prev];
      if (newMessages[messageIndex]) {
        newMessages[messageIndex] = {
          role: 'assistant',
          content: data.response,
          isStreaming: false
        };
      }
      return newMessages;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden">
      {/* Check if financial data is available */}
      {(!currentReports || !currentReports.profitLoss || !currentReports.balanceSheet || !currentReports.cashFlow) ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingState 
            type="ai" 
            message="Waiting for financial data..." 
            className="p-4"
          />
        </div>
      ) : (
        <>
          <div className="h-full flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <Text className="text-gray-500 text-center">Ask a question about your financial data...</Text>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                ref={(el) => {
                  messageRefs.current[index] = el;
                }}
              >
                <div
                  className={`rounded-lg px-4 py-3 text-base font-normal ${
                    message.role === 'user'
                      ? 'max-w-[80%] bg-blue-50 text-blue-800 border border-blue-100'
                      : 'w-full bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  {message.role === 'user' ? (
                    <span className="whitespace-pre-wrap break-words">{message.content}</span>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mb-3">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-bold text-gray-900 mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-bold text-gray-900 mb-2">{children}</h3>,
                          p: ({children}) => <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-outside mb-3 space-y-1 pl-5">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-outside mb-3 space-y-1 pl-5">{children}</ol>,
                          li: ({children}) => <li className="text-gray-700 leading-relaxed mb-1">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                          code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-3">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="flex-shrink-0 border-t border-gray-200 p-4 bg-white flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onInputChange?.(e.target.value);
              }}
              placeholder="Ask about your finances..."
              className="flex-1 bg-white border border-gray-300 text-gray-800 placeholder-gray-500 px-3 py-2 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 font-normal"
              disabled={loading}
            />
            <Button
              type="submit"
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              disabled={loading || !inputValue.trim()}
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}