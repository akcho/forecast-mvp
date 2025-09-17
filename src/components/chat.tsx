import { useState, useEffect, useRef } from 'react';
import { getSessionId, setSessionId } from '@/lib/session';
import { databaseClient } from '@/lib/quickbooks/databaseClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatProps {
  initialInput?: string;
  onInputChange?: (value: string) => void;
}

export default function Chat({ initialInput = '', onInputChange }: ChatProps) {
  console.log('Chat component rendered');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialInput);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update input value when initialInput changes
  useEffect(() => {
    setInputValue(initialInput);
  }, [initialInput]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    console.log('sendMessage called with:', message);
    if (!message.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    onInputChange?.('');

    // Add a placeholder message for the AI response
    const aiMessageIndex = messages.length;
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);

    try {
      console.log('Sending request to /api/chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId() || '',
        },
        body: JSON.stringify({
          message: message,
          stream: true, // Enable streaming
        }),
      });

      console.log('Response status:', response.status);
      
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
    console.log('Response data:', data);

    if (data.sessionId) {
      setSessionId(data.sessionId);
    }

    if (data.type === 'auth_required') {
      console.log('Auth required, setting message:', data.message);
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

    console.log('Setting assistant message:', data.response);
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
    <div className="flex flex-col h-full max-h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 break-words ${
                message.role === 'user'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-black text-blue-400'
              }`}
            >
              <pre className="whitespace-pre-wrap font-mono text-sm">{message.content}</pre>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 border-t border-blue-500/20 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputValue);
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onInputChange?.(e.target.value);
            }}
            placeholder="Ask about your finances..."
            className="flex-1 bg-black border border-blue-500/20 text-blue-400 placeholder-blue-500/50 font-mono px-3 py-2 rounded focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-mono border border-blue-500/20"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
} 