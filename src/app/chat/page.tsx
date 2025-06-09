'use client';

import { useState } from 'react';
import Chat from '@/components/chat';
import { Title, Text } from '@tremor/react';
import { CurrencyDollarIcon, ChartBarIcon, ArrowTrendingUpIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline';

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
  const [inputValue, setInputValue] = useState('');

  const handleExampleClick = (question: string) => {
    setInputValue(question);
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
            <div className="bg-black border border-green-500/20 rounded-lg h-[600px]">
              <Chat initialInput={inputValue} onInputChange={setInputValue} />
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
                        <p className="text-green-500/50 text-sm">{description}</p>
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