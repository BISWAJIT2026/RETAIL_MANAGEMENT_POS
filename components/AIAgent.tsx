
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, Send, X, Sparkles, Loader2, MessageSquare, 
  ChevronDown, BarChart2, Package, Users, Lock, 
  ShieldCheck, ShieldAlert, LogOut 
} from 'lucide-react';
import { useApp } from '../store.tsx';
import { GoogleGenAI } from "@google/genai";

const AIAgent: React.FC = () => {
  const { getDataSnapshot, user: localUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: `Good day, ${localUser?.name || 'Administrator'}. I am your Virtual CFO and Financial Planning Controller. I'm ready to translate our raw retail datasets into decision-ready intelligence. What part of the operation shall we audit?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Constants for sizing
  const AGENT_SIZE = 64;
  const CHAT_WIDTH = 384; 
  const CHAT_HEIGHT = 600; 

  // Dragging State
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 80, 
    y: window.innerHeight - 80 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const wasDragged = useRef(false);

  // Update greeting message content when user name changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'ai') {
        return [{ role: 'ai', content: `Good day, ${localUser?.name || 'Administrator'}. I am your Virtual CFO and Financial Planning Controller. I'm ready to translate our raw retail datasets into decision-ready intelligence. What part of the operation shall we audit?` }];
      }
      return prev;
    });
  }, [localUser?.name]);

  // Boundary clamping on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const currentWidth = isOpen ? CHAT_WIDTH : AGENT_SIZE;
        const currentHeight = isOpen ? CHAT_HEIGHT : AGENT_SIZE;
        return {
          x: Math.max(10, Math.min(prev.x, window.innerWidth - currentWidth - 10)),
          y: Math.max(10, Math.min(prev.y, window.innerHeight - currentHeight - 10))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    wasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    
    if (dx > 5 || dy > 5) {
      wasDragged.current = true;
    }

    if (wasDragged.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const currentWidth = isOpen ? CHAT_WIDTH : AGENT_SIZE;
      const currentHeight = isOpen ? CHAT_HEIGHT : AGENT_SIZE;

      const boundedX = Math.max(10, Math.min(newX, window.innerWidth - currentWidth - 10));
      const boundedY = Math.max(10, Math.min(newY, window.innerHeight - currentHeight - 10));
      
      setPosition({ x: boundedX, y: boundedY });
    }
  }, [isDragging, dragOffset, isOpen]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;
    
    const userMsg = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataSnapshot = getDataSnapshot();
      
      const systemInstruction = `
You are an Enterprise-Grade FP&A AI Agent acting as a Virtual CFO & Financial Planning Controller.
Your core mandate is to translate raw financial data into decision-ready intelligence.
Operate with accounting discipline, FP&A best practices, and audit-safe logic.

Data Context: ${JSON.stringify(dataSnapshot)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: text,
        config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.95,
        }
      });

      const aiContent = response.text || "I apologize, but I encountered a disruption in my financial processing layer.";
      setMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Connection error. Please verify the environment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    { label: "Margin Analysis", text: "What are our estimated contribution margins by category?" },
    { label: "Inventory Audit", text: "Identify inventory stock-out risks and aging stock." },
    { label: "Growth Trends", text: "Analyze the revenue growth trend over the last 12 months." }
  ];

  if (!isOpen) {
    return (
      <button 
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!wasDragged.current) {
            setIsOpen(true);
            setPosition(prev => ({
              x: Math.max(10, Math.min(prev.x, window.innerWidth - CHAT_WIDTH - 10)),
              y: Math.max(10, Math.min(prev.y, window.innerHeight - CHAT_HEIGHT - 10))
            }));
          }
        }}
        style={{ left: position.x, top: position.y }}
        className="fixed w-16 h-16 bg-slate-900 text-orange-500 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-[200] group overflow-hidden border border-white/10 cursor-move"
        title="FP&A Controller Agent (Click to open, Drag to move)"
      >
        <div className="absolute inset-0 bg-orange-500/20 animate-pulse opacity-50 group-hover:opacity-100"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
          <Bot className="w-8 h-8 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
        </div>
        <div className="absolute top-3 right-3 w-4 h-4 bg-orange-500 rounded-full border-2 border-slate-900 shadow-lg flex items-center justify-center">
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
        </div>
      </button>
    );
  }

  return (
    <div 
      style={{ 
        left: position.x, 
        top: position.y,
        width: window.innerWidth < 480 ? 'calc(100vw - 20px)' : '384px' 
      }}
      className="fixed h-[500px] md:h-[600px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] flex flex-col z-[200] border border-slate-200 overflow-hidden animate-in zoom-in-90 duration-300"
    >
      <div 
        onMouseDown={handleMouseDown}
        className="bg-slate-900 p-6 flex items-center justify-between text-white cursor-move select-none flex-shrink-0"
      >
        <div className="flex items-center space-x-3 pointer-events-none">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Virtual CFO</h3>
            <p className="text-[10px] font-bold text-slate-400">FP&A Reasoning Engine</p>
          </div>
        </div>
        <button 
          onMouseDown={(e) => e.stopPropagation()} 
          onClick={() => setIsOpen(false)} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors pointer-events-auto"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-orange-500 text-white rounded-br-none' 
                : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Running Analysis...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => handleSend(s.text)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-500 uppercase hover:bg-orange-50 hover:text-orange-600 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input 
            type="text" 
            placeholder="Input financial query..." 
            className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-orange-500 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAgent;