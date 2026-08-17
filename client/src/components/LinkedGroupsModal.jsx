import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Users, Heart, Trash2, Plus, Info } from 'lucide-react';

export default function LinkedGroupsModal() {
  const {
    isLinkedGroupsModalOpen,
    setIsLinkedGroupsModalOpen,
    tripData,
    token,
    showToast,
    refreshTripData
  } = useApp();

  const [groupName, setGroupName] = useState('Family Group');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isLinkedGroupsModalOpen || !tripData) return null;

  const handleToggleMember = (mId) => {
    setSelectedMemberIds(prev =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMemberIds.length < 2) {
      showToast('Please select at least 2 members for a family group', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/linked-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: tripData.trip.id,
          name: groupName,
          memberIds: selectedMemberIds
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Linked Group "${groupName}" created! 👨‍👩‍👧‍👦`, 'success');
        refreshTripData();
        setGroupName('Family Group');
        setSelectedMemberIds([]);
      } else {
        showToast(data.error || 'Failed to create group', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const res = await fetch(`/api/linked-groups/${groupId}?tripId=${tripData.trip.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Linked group removed', 'info');
        refreshTripData();
      }
    } catch (err) {
      showToast('Failed to delete group', 'error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart color="var(--accent-rose)" /> Linked Members / Family Groups
          </h3>
          <button onClick={() => setIsLinkedGroupsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: 16 }}>
            <div style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Link financially connected members (e.g. Brother & Sister, Husband & Wife, Parent & Child).
                <strong> Individual balances are still calculated per person</strong>, but you get a combined group view for easy settlement without double counting!
              </span>
            </div>
          </div>

          {/* Existing Linked Groups List */}
          {tripData.linkedGroups.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Existing Linked Groups</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tripData.linkedGroups.map(lg => (
                  <div key={lg.id} className="glass-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {lg.members.map(m => m.display_name).join(' + ')}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Financially Linked Group Members
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 6, color: lg.combinedBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        Combined Balance: {tripData.trip.currency}{lg.combinedBalance >= 0 ? '+' : ''}{lg.combinedBalance}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(lg.id)}
                      className="btn btn-danger btn-sm"
                      title="Unlink Group"
                    >
                      <Trash2 size={16} /> Unlink
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Linked Group Form */}
          <form onSubmit={handleCreateGroup} style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 12 }}>+ Link Members into a New Group</h4>

            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                required
                placeholder="Enter group name"
                className="form-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select Members to Link together</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {tripData.members.map(m => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: isChecked ? 'var(--badge-positive-bg)' : 'var(--bg-secondary)',
                        border: '1px solid',
                        borderColor: isChecked ? 'var(--accent-emerald)' : 'var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '0.88rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMember(m.id)}
                        style={{ accentColor: 'var(--accent-emerald)' }}
                      />
                      <span>{m.display_name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || selectedMemberIds.length < 2}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            >
              {loading ? 'Creating Link...' : 'Link Selected Members'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
