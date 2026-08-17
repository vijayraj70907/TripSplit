import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Link2, Users, CheckCircle2, Search, ArrowRight } from 'lucide-react';

export default function JoinTripModal() {
  const { isJoinTripModalOpen, setIsJoinTripModalOpen, token, fetchMyTrips, selectTrip, setActiveTab, showToast, user } = useApp();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [displayName, setDisplayName] = useState(user ? user.name : '');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Sync displayName when user details load
  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.name);
    }
  }, [user]);

  // Extract join code from URL parameters when modal is opened
  useEffect(() => {
    if (isJoinTripModalOpen) {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      if (joinCode) {
        setCode(joinCode);
        
        // Auto-fetch preview
        const fetchPreview = async () => {
          setPreviewLoading(true);
          try {
            const res = await fetch(`/api/trips/preview/${encodeURIComponent(joinCode.trim())}`);
            const data = await res.json();
            if (res.ok) {
              setPreview(data.trip);
            }
          } catch (err) {
            console.error('Error fetching preview:', err);
          } finally {
            setPreviewLoading(false);
          }
        };
        fetchPreview();
      }
    }
  }, [isJoinTripModalOpen]);

  if (!isJoinTripModalOpen) return null;

  const handleFetchPreview = async (e) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/trips/preview/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setPreview(data.trip);
      } else {
        setPreview(null);
        showToast(data.error || 'Trip not found with this code', 'error');
      }
    } catch (err) {
      showToast('Error looking up trip code', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;
    setLoading(true);

    try {
      const res = await fetch('/api/trips/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: preview.code, displayName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Joined ${preview.name} successfully! 🎉`, 'success');
        await fetchMyTrips();
        selectTrip(data.tripId);
        setActiveTab('dashboard'); // Open dashboard view
        setIsJoinTripModalOpen(false);
        setPreview(null);
        setCode('');
        
        // Clean up URL parameter to avoid re-opening modal on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        showToast(data.error || 'Failed to join trip', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 color="var(--accent-blue)" /> Join Trip via Code / Link
          </h3>
          <button onClick={() => setIsJoinTripModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleFetchPreview} className="form-group">
            <label className="form-label">Enter Join Code or Invitation Link</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                required
                placeholder="e.g. GOA7821"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}
              />
              <button type="submit" disabled={previewLoading} className="btn btn-secondary">
                {previewLoading ? 'Finding...' : <Search size={18} />}
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Tip: You can paste a full invite link or enter code (e.g., GOA7821)
            </span>
          </form>

          {/* Live Preview Card */}
          {preview && (
            <div className="glass-card" style={{ padding: 18, marginTop: 16, border: '1px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <img
                  src={preview.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'}
                  alt={preview.name}
                  style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{preview.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created by {preview.creatorName}</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="var(--accent-emerald)" /> Current Members ({preview.members.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {preview.members.map(m => (
                    <span key={m.id} className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
                      {m.display_name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Your Name in this Trip</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Joining Trip...' : 'Join Trip Now'} <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
