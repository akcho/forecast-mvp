import { useState, useRef, useEffect } from 'react';
import { getSessionId, setSessionId } from '@/lib/session';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { Title, Text, Button } from '@tremor/react';

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

  useEffect(() => {
    setInputValue(initialInput);
  }, [initialInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
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
    setMessages((prev) => {
      const aiMessageIndex = prev.length;
      // Use setTimeout to ensure state update completes before API call
      setTimeout(() => {
        handleAIResponse(aiMessageIndex);
      }, 0);
      return [...prev, {
        role: 'assistant',
        content: '',
        isStreaming: true
      }];
    });
    
    return; // Exit early, API call will be handled in setTimeout
    
    async function handleAIResponse(aiMessageIndex: number) {

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId() || '',
          'X-QB-Access-Token': quickBooksStore.getAccessToken() || '',
          'X-QB-Realm-ID': quickBooksStore.getRealmId() || '',
          'X-QB-Refresh-Token': quickBooksStore.getRefreshToken() || '',
        },
        body: JSON.stringify({
          message: message,
          currentReports: currentReports,
          timePeriod: timePeriod,
          stream: true, // Enable streaming
        }),
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
    }
  }
  };

  const handleStreamingResponse = async (response: Response, messageIndex: number) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let sessionId: string | null = null;

    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'session':
                  sessionId = data.sessionId;
                  if (sessionId) {
                    setSessionId(sessionId);
                  }
                  break;
                case 'chunk':
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages[messageIndex]) {
                      newMessages[messageIndex] = {
                        ...newMessages[messageIndex],
                        content: newMessages[messageIndex].content + data.content,
                        isStreaming: true
                      };
                    }
                    return newMessages;
                  });
                  break;
                case 'end':
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages[messageIndex]) {
                      newMessages[messageIndex] = {
                        ...newMessages[messageIndex],
                        isStreaming: false
                      };
                    }
                    return newMessages;
                  });
                  return;
                case 'error':
                  throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
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
      <div className="h-full flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <Text className="text-gray-500 text-center">Ask a question about your financial data...</Text>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-base font-normal whitespace-pre-wrap break-words ${
                message.role === 'user'
                  ? 'bg-blue-50 text-blue-800 border border-blue-100'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {message.content}
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
        className="flex-shrink-0 border-t border-gray-200 p-4 bg-white"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onInputChange?.(e.target.value);
          }}
          placeholder="Ask about your finances..."
          className="flex-1 bg-blue-50 border border-blue-200 text-gray-800 placeholder-blue-400 px-3 py-2 rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 font-normal"
          disabled={loading}
        />
        <Button
          type="submit"
          className="ml-2"
          disabled={loading || !inputValue.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
}