'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Title, Text, TextInput } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { ChartBarIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const exampleQuestions = [
  {
    question: "What's our current runway?",
    icon: ClockIcon,
    description: "Calculate how long we can operate with current cash"
  },
  {
    question: "How much are we spending on marketing?",
    icon: ChartBarIcon,
    description: "Break down our marketing expenses"
  },
  {
    question: "When will we break even?",
    icon: ArrowTrendingUpIcon,
    description: "Project our path to profitability"
  },
  {
    question: "What's our monthly burn rate?",
    icon: BanknotesIcon,
    description: "See our current monthly expenses"
  },
  {
    question: "Show me our top expenses",
    icon: CurrencyDollarIcon,
    description: "Identify our largest cost centers"
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add welcome message on mount
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Connected to QuickBooks

I can help you understand your company's finances. What would you like to know?`
    }]);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  return (
    <main className="min-h-screen bg-black text-green-400 font-mono">
      <div className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded">
              <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <Title className="text-green-400 font-mono">FINANCIAL ASSISTANT</Title>
              <Text className="text-green-500/70 font-mono">Connected to QuickBooks</Text>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-black border border-green-500/20 rounded-lg">
              <div className="flex flex-col h-[600px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2 p-4 font-mono text-sm">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] p-3 ${
                          message.role === 'user'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-black text-green-400'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap">{message.content}</pre>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-black p-3">
                        <Text className="text-green-500/50 font-mono">_</Text>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-green-500/20 p-4">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Ask about your finances..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full bg-black border border-green-500/20 text-green-400 placeholder-green-500/50 font-mono px-3 py-2 rounded focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:bg-green-500/5 transition-colors font-mono border border-green-500/20"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Example Questions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black border border-green-500/20 rounded-lg h-[600px]">
              <Title className="text-green-400 font-mono mb-4 px-4 pt-4">SUGGESTED QUESTIONS</Title>
              <div className="space-y-2 px-4 pb-4">
                {exampleQuestions.map(({ question, icon: Icon, description }, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(question)}
                    className="w-full text-left p-3 bg-black hover:bg-green-500/5 transition-colors group border border-green-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-500/10 rounded group-hover:bg-green-500/20 transition-colors">
                        <Icon className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-green-400 font-mono mb-1">{question}</p>
                        <p className="text-sm text-green-500/70 font-mono">{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 