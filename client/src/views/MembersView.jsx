import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Heart, Plus, ShieldCheck, UserPlus, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function MembersView() {
  const { tripData, token, setIsLinkedGroupsModalOpen, showToast, refreshTripData } = useApp();
  const [guestName, setGuestName] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!tripData) return null;
  const { trip, members, linkedGroups } = tripData;
  const currency = trip.currency;

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/add-guest-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: guestName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Member "${guestName}" added!`, 'success');
        refreshTripData();
        setGuestName('');
        setShowAddGuest(false);
      } else {
        showToast(data.error || 'Failed to add member', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this trip?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Member "${memberName}" removed!`, 'success');
        refreshTripData();
      } else {
        showToast(data.error || 'Failed to remove member', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Trip Members ({members.length})</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Individual balances &amp; Family group linkages
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setIsLinkedGroupsModalOpen(true)} className="btn btn-secondary">
            <Heart size={18} color="var(--accent-rose)" /> Family Group Link
          </button>

          <button onClick={() => setShowAddGuest(!showAddGuest)} className="btn btn-primary">
            <UserPlus size={18} /> Add Member
          </button>
        </div>
      </div>

      {/* Add Guest Member Drawer */}
      {showAddGuest && (
        <form onSubmit={handleAddGuest} className="glass-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            required
            placeholder="Enter member's name..."
            className="form-input"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}

      {/* Linked Members / Family Groups Section */}
      {linkedGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} color="var(--accent-rose)" /> Linked Family Groups ({linkedGroups.length})
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            {linkedGroups.map(lg => (
              <div key={lg.id} className="glass-card" style={{ padding: 20, borderLeft: '4px solid var(--accent-rose)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {lg.members.map(m => m.display_name).join(' & ')}
                  </h4>
                  <span className={`badge ${lg.combinedBalance >= 0 ? 'badge-positive' : 'badge-negative'}`}>
                    Combined: {currency}{lg.combinedBalance >= 0 ? '+' : ''}{lg.combinedBalance}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Financially Linked Family Members
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: 'var(--bg-primary)', padding: 10, borderRadius: 8, textAlign: 'center', fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Total Paid</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{lg.totalPaid}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Total Share</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{lg.totalShare}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Balance</div>
                    <div style={{ fontWeight: 700, color: lg.combinedBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {currency}{lg.combinedBalance}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Members Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Individual Member Balances</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => {
            const isPositive = m.netBalance >= 0;

            return (
              <div key={m.id} className="glass-card" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img
                    src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.display_name}`}
                    alt={m.display_name}
                    style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--border-color)' }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{m.display_name}</h4>
                      {m.role === 'owner' && <span className="badge badge-neutral">Owner</span>}
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleDeleteMember(m.id, m.display_name)}
                          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                          title="Remove Member"
                        >
                          <Trash2 size={13} color="var(--accent-rose)" />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Paid: <strong>{currency}{m.totalPaid}</strong> • Share: <strong>{currency}{m.totalShare}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Net Balance
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {isPositive ? '+' : ''}{currency}{m.netBalance}
                    </div>
                  </div>

                  <span className={`badge ${isPositive ? 'badge-positive' : 'badge-negative'}`} style={{ padding: '6px 12px' }}>
                    {isPositive ? 'Gets Back' : 'Owes Money'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
