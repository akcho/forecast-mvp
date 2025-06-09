import { useState, useRef, useEffect } from 'react';
import { getSessionId, setSessionId } from '@/lib/session';
import { quickBooksStore } from '@/lib/quickbooks/store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

    try {
      console.log('Sending request to /api/chat');
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
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.type === 'auth_required') {
        console.log('Auth required, setting message:', data.message);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message,
          },
        ]);
        return;
      }

      console.log('Setting assistant message:', data.response);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-black text-green-400'
              }`}
            >
              <pre className="whitespace-pre-wrap font-mono text-sm">{message.content}</pre>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-green-500/20 p-4">
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
            className="flex-1 bg-black border border-green-500/20 text-green-400 placeholder-green-500/50 font-mono px-3 py-2 rounded focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-mono border border-green-500/20"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
} 