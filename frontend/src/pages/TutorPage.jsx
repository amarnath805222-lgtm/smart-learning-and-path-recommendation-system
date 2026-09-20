import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Brain, Send, Copy, RefreshCw, Zap, CheckCheck, Sparkles } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { aiAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function getSuggestedQuestions(careerGoal) {
  if (!careerGoal) {
    return [
      'What should I learn next based on my profile?',
      'How do I test my current skill level?',
      'Can you recommend a hands-on project to build?',
      'Explain the fundamental concepts I need to know first.',
      'What are the most in-demand skills in tech right now?',
    ];
  }
  return [
    `What skills should I prioritize to become a ${careerGoal}?`,
    `Give me a real-world portfolio project idea for a ${careerGoal}.`,
    `Explain the most important architecture/pattern for ${careerGoal}.`,
    `What are common interview questions for ${careerGoal}?`,
    `How does my current learning path prepare me for ${careerGoal}?`,
    `Recommend top industry resources for ${careerGoal}.`,
  ];
}

function MessageBubble({ msg, onCopy, onRegenerate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy();
  };

  return (
    <motion.div
      className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        maxWidth: '85%',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        minWidth: 0,
      }}
    >
      {msg.role === 'ai' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 8,
            background: 'linear-gradient(135deg, #6c63ff, #00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Brain size={13} color="white" />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.06em' }}>
            AI TUTOR
          </span>
        </div>
      )}

      <div style={{ fontSize: '0.875rem', lineHeight: 1.7, overflow: 'hidden' }}>
        {msg.role === 'ai' ? (
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div style={{ position: 'relative', margin: '12px 0', maxWidth: '100%', overflowX: 'auto' }}>
                    <div style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 1,
                      display: 'flex', gap: 6,
                    }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(108,99,255,0.3)', color: '#8b85ff',
                        fontSize: '0.65rem', fontWeight: 700,
                      }}>
                        {match[1]}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(String(children))}
                        style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.1)', color: '#a0a0c0',
                          fontSize: '0.65rem', cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        borderRadius: 10, fontSize: '0.82rem',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        marginTop: 0,
                        maxWidth: '100%',
                        overflowX: 'auto',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code style={{
                    background: 'rgba(108,99,255,0.15)', padding: '2px 6px',
                    borderRadius: 4, color: '#b0a8ff', fontSize: '0.85em',
                    fontFamily: 'JetBrains Mono, monospace',
                  }} {...props}>{children}</code>
                );
              },
              p: ({ children }) => <p style={{ marginBottom: 8, color: 'var(--ink, #0B1220)' }}>{children}</p>,
              h3: ({ children }) => <h3 style={{ color: 'var(--ink, #0B1220)', fontWeight: 700, marginBottom: 6, marginTop: 12 }}>{children}</h3>,
              ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8, color: 'var(--ink, #0B1220)' }}>{children}</ul>,
              li: ({ children }) => <li style={{ marginBottom: 4, listStyle: 'disc' }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: 'var(--ink, #0B1220)', fontWeight: 700 }}>{children}</strong>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        ) : (
          <span style={{ color: '#ffffff', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        )}
      </div>

      {msg.role === 'ai' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: 'transparent', border: '1px solid var(--bdr, #CBD5E1)',
              borderRadius: 8, fontSize: '0.72rem', color: 'var(--muted, #56657F)', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? <CheckCheck size={11} color="#10b981" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                background: 'transparent', border: '1px solid var(--bdr, #CBD5E1)',
                borderRadius: 8, fontSize: '0.72rem', color: 'var(--muted, #56657F)', cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} /> Regenerate
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function TutorPage() {
  const { user, profile } = useAuthStore();
  const careerGoal = profile?.profile?.career_goal || '';
  const suggestedQuestions = getSuggestedQuestions(careerGoal);

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `Hello, ${user?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your AI Learning Tutor.

${careerGoal ? `I see your target goal is **${careerGoal}**.` : 'I have access to your personalized learning profile.'} You can ask me anything about:
- Your target skills and next steps
- Concepts, algorithms, and real-world architectures
- Code walkthroughs, debugging, and practice problems
- Career guidance and interview preparation

**What would you like to explore today?**`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        content: m.content,
      }));
      const res = await aiAPI.chat({ message: text, history });
      setMessages((m) => [...m, { role: 'ai', content: res.data.response }]);
    } catch {
      setMessages((m) => [...m, {
        role: 'ai',
        content: '❌ Failed to get a response. Make sure the backend server is running.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setMessages((m) => m.slice(0, -1));
    await sendMessage(lastUser.content);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <DashboardLayout fullHeight={true}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--bdr, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          background: 'transparent',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #2F5BFF, #00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Brain size={19} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--ink, #0B1220)', fontSize: '0.98rem' }}>AI Tutor</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #56657F)' }}>
              Context-Aware AI Tutor · {careerGoal || 'Personalized'}
            </div>
          </div>
          <div className="ai-badge" style={{ marginLeft: 'auto' }}>
            <Sparkles size={11} /> 100% Dynamic
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'transparent',
        }}>
          <div style={{
            maxWidth: 860,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
          }}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                onRegenerate={i === messages.length - 1 && msg.role === 'ai' ? regenerate : null}
              />
            ))}
            {loading && (
              <motion.div className="chat-message ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 120 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '6px 2px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#2F5BFF',
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={messagesEnd} />
          </div>
        </div>

        {/* Suggested questions */}
        <div style={{
          padding: '10px 24px',
          borderTop: '1px solid var(--bdr, #E2E8F0)',
          background: 'transparent',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <div style={{
            maxWidth: 860,
            margin: '0 auto',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid var(--bdr, #CBD5E1)',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#2F5BFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="chat-input-row" style={{
          padding: '14px 24px 18px',
          borderTop: '1px solid var(--bdr, #E2E8F0)',
          background: 'transparent',
          flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{
            maxWidth: 860,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            paddingRight: 76,
          }}>
            <textarea
              className="input"
              placeholder={careerGoal ? `Ask anything about ${careerGoal}, concepts, projects...` : "Ask anything about your learning path..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              style={{
                resize: 'none', flex: 1,
                minHeight: 44, maxHeight: 120,
                borderRadius: 10,
                fontSize: '0.9rem',
                border: '1px solid var(--bdr, #CBD5E1)',
                background: 'transparent',
                color: 'var(--ink, #0B1220)',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ flexShrink: 0, height: 44, width: 44, padding: 0, borderRadius: 10, justifyContent: 'center' }}
            >
              {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
