import { useState, useRef, useEffect } from 'react';
import { getSessionId, setSessionId } from '@/lib/session';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { Title, Text, Button } from '@tremor/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    onInputChange?.('');

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
        }),
      });

      const data = await response.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.type === 'auth_required') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message,
          },
        ]);
        setLoading(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <Text className="text-gray-500 text-center">Ask a question about your financial data...</Text>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-base font-normal whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-green-50 text-green-800 border border-green-100'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {message.content}
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
        className="flex border-t border-gray-200 p-4 bg-white"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onInputChange?.(e.target.value);
          }}
          placeholder="Ask about your finances..."
          className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 px-3 py-2 rounded focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 font-normal"
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