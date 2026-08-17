import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, Send, CheckCircle, Bot, User } from 'lucide-react';

export default function AIAssistantModal() {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    tripData,
    token,
    showToast,
    refreshTripData
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hi! I'm your TripSplit AI Assistant 🪄. You can tell me expenses like *\"I paid ₹850 for dinner for 3 people\"* or ask questions like *\"Who owes me money?\"* or *\"What is total trip cost?\"*."
    }
  ]);
  const [parsedExpense, setParsedExpense] = useState(null);

  if (!isAIAssistantOpen || !tripData) return null;

  const handleSendPrompt = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: tripData.trip.id,
          prompt: userText
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.type === 'qa_response') {
          setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
        } else if (data.type === 'expense_parsed') {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: `I've extracted your expense details below! Please review and confirm to save:`
          }]);
          setParsedExpense(data.data);
        }
      } else {
        showToast(data.error || 'AI query failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to AI service', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSaveExpense = async () => {
    if (!parsedExpense) return;
    setLoading(true);

    const numAmount = parsedExpense.amount;
    const participants = parsedExpense.participantIds.map(id => ({
      member_id: id,
      share_amount: Math.round((numAmount / parsedExpense.participantIds.length) * 100) / 100
    }));

    const payload = {
      tripId: tripData.trip.id,
      title: parsedExpense.title,
      total_amount: numAmount,
      date: new Date().toISOString().split('T')[0],
      category: parsedExpense.category,
      split_method: 'equal',
      notes: 'Added via AI Assistant',
      payers: [{ member_id: parsedExpense.paidByMemberId, amount_paid: numAmount }],
      participants
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Expense "${parsedExpense.title}" saved via AI! 🎯`, 'success');
        refreshTripData();
        setParsedExpense(null);
        setMessages(prev => [...prev, { sender: 'ai', text: `Saved! Total balance updated.` }]);
      }
    } catch (err) {
      showToast('Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 520, height: 600, display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa' }}>
            <Sparkles color="#a78bfa" /> AI Expense & Q&A Assistant
          </h3>
          <button onClick={() => setIsAIAssistantOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Chat History Messages */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 10,
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {m.sender === 'ai' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
              )}
              <div
                style={{
                  background: m.sender === 'user' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-primary)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: '0.9rem',
                  border: m.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  whiteSpace: 'pre-line'
                }}
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Confirmation Card for Parsed Expense */}
          {parsedExpense && (
            <div className="glass-card" style={{ padding: 14, border: '1px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.1)', marginTop: 6 }}>
              <h4 style={{ fontSize: '0.95rem', color: '#a78bfa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Confirm Expense Entry
              </h4>
              <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                <div><strong>Title:</strong> {parsedExpense.title}</div>
                <div><strong>Amount:</strong> {tripData.trip.currency}{parsedExpense.amount}</div>
                <div><strong>Category:</strong> {parsedExpense.category}</div>
                <div><strong>Paid by:</strong> {parsedExpense.paidByName}</div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Participants:</strong> {parsedExpense.participantNames.join(', ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleConfirmSaveExpense} disabled={loading} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  Confirm & Save Expense
                </button>
                <button onClick={() => setParsedExpense(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleSendPrompt} style={{ padding: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, background: 'var(--bg-secondary)' }}>
          <input
            type="text"
            placeholder="Type an expense or ask a question..."
            className="form-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-accent" style={{ padding: '0 16px' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
