
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, MessageCircle } from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myId = getUserId();

  const quickReplies = ['👍 Enterado', '⚠️ ¿Sigue el tráfico?', '✅ Camino despejado', '🚨 Precaución'];

  const fetchMessages = async () => {
    // CAMBIO: Ahora los mensajes también duran 24 horas para consistencia
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('chat_mensajes')
      .select('*')
      .gt('created_at', yesterday)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content) return;

    setInputText('');
    await supabase.from('chat_mensajes').insert([{
      usuario_id: myId,
      contenido: content
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/5 shadow-2xl">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-yellow-400" size={20} />
          <h2 className="text-white font-black text-xs uppercase tracking-widest">Chat Comunidad</h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Sin mensajes en las últimas 24h</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.usuario_id === myId ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                msg.usuario_id === myId 
                ? 'bg-yellow-400 text-slate-900 rounded-tr-none' 
                : 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/5'
              }`}>
                {msg.contenido}
              </div>
              <span className="text-[8px] text-slate-600 font-bold mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-white/5 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black py-2 px-4 rounded-full border border-white/5 transition-colors active:scale-95"
            >
              {reply}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
            placeholder="Escribe algo..."
            className="flex-1 bg-slate-800 border border-white/5 rounded-2xl px-4 py-3 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
          <button
            onClick={() => sendMessage(inputText)}
            className="bg-yellow-400 text-slate-900 p-3 rounded-2xl active:scale-90 transition-all shadow-lg shadow-yellow-400/20"
          >
            <Send size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
