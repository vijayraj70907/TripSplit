import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, Mail, LogOut, Check, Edit2, ShieldAlert } from 'lucide-react';

export default function UserProfileModal() {
  const { user, token, login, isProfileModalOpen, setIsProfileModalOpen, logout, showToast, refreshTripData } = useApp();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user ? user.name : '');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      // Extract seed if using dicebear
      if (user.avatar_url && user.avatar_url.includes('seed=')) {
        const match = user.avatar_url.match(/seed=([^&]+)/);
        if (match) setAvatarSeed(match[1]);
      }
    }
  }, [user, isProfileModalOpen]);

  if (!isProfileModalOpen || !user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const newAvatarUrl = avatarSeed.trim()
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed.trim())}`
      : user.avatar_url;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), avatar_url: newAvatarUrl })
      });
      const data = await res.json();
      if (res.ok) {
        // Update user state in AppContext
        login(data.user, token);
        // Refresh trip data so members list picks up the new name immediately
        refreshTripData();
        showToast('Profile updated! Your name is now updated across all trips.', 'success');
        setEditing(false);
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRandomizeAvatar = () => {
    const randomSeeds = ['Sunny', 'Shadow', 'Sparky', 'Gamer', 'Explorer', 'Traveler', 'Splitser', 'Rocky', 'Skye', 'Ocean'];
    const randomSeed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)] + Math.floor(Math.random() * 100);
    setAvatarSeed(randomSeed);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content" style={{ maxWidth: 420, overflow: 'hidden' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User color="var(--accent-emerald)" size={20} /> My Profile Account
          </h3>
          <button
            onClick={() => { setIsProfileModalOpen(false); setEditing(false); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            {/* Avatar Display */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <img
                src={avatarSeed
                  ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`
                  : (user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`)
                }
                alt={user.name}
                style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--accent-emerald)', padding: 4, background: 'var(--bg-primary)' }}
              />
              {editing && (
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--accent-emerald)',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                  title="Randomize Avatar"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>

            {/* Profile Content */}
            {!editing ? (
              <>
                <h4 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {user.name}
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Mail size={14} color="var(--text-muted)" /> {user.email}
                </p>

                <button
                  onClick={() => { setEditing(true); setAvatarSeed(user.avatar_url?.match(/seed=([^&]+)/)?.[1] || ''); }}
                  className="btn btn-secondary"
                  style={{ marginTop: 16, padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  Edit Profile Name
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile} style={{ width: '100%', textAlign: 'left' }}>
                {/* Edit Name input */}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                {/* Edit Avatar seed input */}
                <div className="form-group">
                  <label className="form-label">Avatar Seed Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={avatarSeed}
                    onChange={(e) => setAvatarSeed(e.target.value)}
                    placeholder="e.g. Sunny, Explorer (optional)"
                  />
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                  >
                    <Check size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Stats / Account Information */}
          <div className="glass-card" style={{ padding: 16, background: 'var(--bg-secondary)', marginBottom: 20 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
              Account Information
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Account Email:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Verified Active
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          {!editing && (
            <button
              onClick={() => {
                setIsProfileModalOpen(false);
                logout();
              }}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: 8, borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.04)' }}
            >
              <LogOut size={16} /> Log Out of Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
