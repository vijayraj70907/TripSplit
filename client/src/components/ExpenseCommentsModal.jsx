import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, MessageSquare, Send, User } from 'lucide-react';

export default function ExpenseCommentsModal({ expense, onClose }) {
  const { token, tripData, showToast } = useApp();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!expense) return;
    try {
      const res = await fetch(`/api/expenses/${expense.id}/comments?tripId=${tripData.trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [expense]);

  if (!expense || !tripData) return null;

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: tripData.trip.id,
          content: content.trim()
        })
      });
      if (res.ok) {
        setContent('');
        fetchComments();
        showToast('Comment added!', 'success');
      }
    } catch (err) {
      showToast('Failed to post comment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 480, height: 500, display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare color="var(--accent-blue)" /> Comments: {expense.title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px', fontSize: '0.9rem' }}>
              No comments on this expense yet. Ask a question or post a note!
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>{c.author_name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{c.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handlePostComment} style={{ padding: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, background: 'var(--bg-secondary)' }}>
          <input
            type="text"
            required
            placeholder="Write a comment or note..."
            className="form-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
