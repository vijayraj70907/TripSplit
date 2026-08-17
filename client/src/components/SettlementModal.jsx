import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, ArrowRight, DollarSign } from 'lucide-react';

export default function SettlementModal() {
  const {
    isSettlementModalOpen,
    setIsSettlementModalOpen,
    settlementTarget,
    setSettlementTarget,
    tripData,
    token,
    showToast,
    refreshTripData
  } = useApp();

  const [payerId, setPayerId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tripData || !tripData.members.length) return;

    if (settlementTarget) {
      setPayerId(settlementTarget.fromId);
      setPayeeId(settlementTarget.toId);
      setAmount(settlementTarget.amount.toString());
      setNotes(`Settlement to ${settlementTarget.toName}`);
    } else {
      setPayerId(tripData.members[0].id);
      setPayeeId(tripData.members[1]?.id || tripData.members[0].id);
      setAmount('');
      setNotes('Direct settlement payment');
    }
  }, [isSettlementModalOpen, settlementTarget, tripData]);

  if (!isSettlementModalOpen || !tripData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (payerId === payeeId) {
      showToast('Payer and payee cannot be the same member', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settlements/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: tripData.trip.id,
          payerMemberId: Number(payerId),
          payeeMemberId: Number(payeeId),
          amount: numAmount,
          date,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Trigger celebratory confetti animation!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        showToast('Payment recorded & debt settled! 🎉', 'success');
        refreshTripData();
        setIsSettlementModalOpen(false);
        setSettlementTarget(null);
      } else {
        showToast(data.error || 'Failed to record settlement', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  const payerName = tripData.members.find(m => m.id === Number(payerId))?.display_name || 'Payer';
  const payeeName = tripData.members.find(m => m.id === Number(payeeId))?.display_name || 'Payee';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 color="var(--accent-emerald)" /> Mark Payment as Settled
          </h3>
          <button onClick={() => { setIsSettlementModalOpen(false); setSettlementTarget(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Transfer Visualizer */}
          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid By</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-rose)' }}>{payerName}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {tripData.trip.currency}{amount || 0}
              </span>
              <ArrowRight size={20} color="var(--accent-emerald)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Received By</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-emerald)' }}>{payeeName}</div>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Who Paid? (Payer)</label>
              <select className="form-select" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {tripData.members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Who Received? (Payee)</label>
              <select className="form-select" value={payeeId} onChange={(e) => setPayeeId(e.target.value)}>
                {tripData.members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Settlement Amount ({tripData.trip.currency}) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via Google Pay / PhonePe / Cash"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
            <button type="button" onClick={() => { setIsSettlementModalOpen(false); setSettlementTarget(null); }} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
