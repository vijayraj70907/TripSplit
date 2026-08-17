import React from 'react';
import { useApp } from '../context/AppContext';
import { Copy, Share2, MessageSquare, QrCode, Check, ShieldCheck, MapPin } from 'lucide-react';

export default function TripSettingsView() {
  const { tripData, showToast } = useApp();

  if (!tripData) return null;
  const { trip, members } = tripData;
  const joinUrl = `${window.location.origin}?join=${trip.code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    showToast('Invitation link copied to clipboard! 📋', 'success');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trip.code);
    showToast(`Join code "${trip.code}" copied!`, 'success');
  };

  const handleShareWhatsApp = () => {
    const text = `Join my trip "${trip.name}" on TripSplit!\nJoin Code: ${trip.code}\nLink: ${joinUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Share Trip & Settings</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Invite friends, manage trip settings, and share join codes
        </p>
      </div>

      {/* Share Box */}
      <div className="glass-card" style={{ padding: 24, border: '1px solid var(--accent-emerald)' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Share2 color="var(--accent-emerald)" /> Invite Friends to {trip.name}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Anyone with the link or join code can preview and join your trip instantly.
        </p>

        {/* Join Code Highlight Box */}
        <div style={{ background: 'var(--bg-primary)', padding: 18, borderRadius: 12, border: '1px dashed var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Unique Join Code</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: 2 }}>
              {trip.code}
            </div>
          </div>

          <button onClick={handleCopyCode} className="btn btn-primary">
            <Copy size={18} /> Copy Code
          </button>
        </div>

        {/* Share Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button onClick={handleCopyLink} className="btn btn-secondary" style={{ flex: 1 }}>
            <Copy size={18} /> Copy Invite Link
          </button>
          <button onClick={handleShareWhatsApp} className="btn btn-accent" style={{ flex: 1, background: '#25D366' }}>
            <MessageSquare size={18} /> Share via WhatsApp
          </button>
        </div>
      </div>

      {/* Trip Details Card */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="var(--accent-blue)" /> Trip Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9rem' }}>
          <div><strong>Trip Name:</strong> {trip.name}</div>
          <div><strong>Currency:</strong> {trip.currency}</div>
          <div><strong>Start Date:</strong> {trip.start_date || 'N/A'}</div>
          <div><strong>End Date:</strong> {trip.end_date || 'N/A'}</div>
          <div style={{ gridColumn: 'span 2' }}>
            <strong>Description:</strong> {trip.description || 'No description provided.'}
          </div>
        </div>
      </div>
    </div>
  );
}
