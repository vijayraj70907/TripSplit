import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeftRight, CheckCircle2, ArrowRight, History, Heart } from 'lucide-react';

export default function SettlementsView() {
  const { tripData, token, setIsSettlementModalOpen, setSettlementTarget } = useApp();
  const [history, setHistory] = useState([]);

  const fetchSettlementHistory = async () => {
    if (!tripData) return;
    try {
      const res = await fetch(`/api/settlements/history?tripId=${tripData.trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.settlements);
      }
    } catch (err) {
      console.error('Error fetching settlement history:', err);
    }
  };

  useEffect(() => {
    fetchSettlementHistory();
  }, [tripData]);

  if (!tripData) return null;
  const { trip, members, linkedGroups, simplifiedSettlements } = tripData;
  const currency = trip.currency;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Trip Settlement Optimization</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Automatically minimized payment routes to settle all debts
          </p>
        </div>
      </div>

      {/* Linked Group Settlement Summary Cards */}
      {linkedGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} color="var(--accent-rose)" /> Family Group Settlements
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            {linkedGroups.map(lg => (
              <div key={lg.id} className="glass-card" style={{ padding: 18, borderLeft: '4px solid var(--accent-rose)' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4 }}>{lg.name}</h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Combined Paid: <strong>{currency}{lg.totalPaid}</strong> • Share: <strong>{currency}{lg.totalShare}</strong>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 8, color: lg.combinedBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  Combined Group Balance: {currency}{lg.combinedBalance >= 0 ? '+' : ''}{lg.combinedBalance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimized Settlement Cards */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight size={20} color="var(--accent-emerald)" /> Simplified Settlement Plan ({simplifiedSettlements.length} Transfers)
        </h3>

        {simplifiedSettlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ marginBottom: 12 }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Everyone is all settled up! 🎉</h3>
            <p style={{ fontSize: '0.9rem', marginTop: 4 }}>No remaining debts or payments required.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {simplifiedSettlements.map((s, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 16, border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={s.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.fromName}`} alt={s.fromName} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>{s.fromName}</span>
                  </div>

                  <ArrowRight size={20} color="var(--accent-emerald)" />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{s.toName}</span>
                    <img src={s.toAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.toName}`} alt={s.toName} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Owed</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {currency}{s.amount}
                    </div>
                  </div>

                  {s.fromId === tripData.currentMember?.member_id ? (
                    <button
                      onClick={() => { setSettlementTarget(s); setIsSettlementModalOpen(true); }}
                      className="btn btn-primary btn-sm"
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Waiting for payment
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settlement Payment Logs */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} color="var(--accent-blue)" /> Payment & Settlement Logs
        </h3>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No recorded settlement payments yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(item => (
              <div key={item.id} style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.88rem'
              }}>
                <div>
                  <strong style={{ color: 'var(--accent-rose)' }}>{item.payerName}</strong> paid <strong style={{ color: 'var(--accent-emerald)' }}>{item.payeeName}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>({item.notes || 'Settlement'})</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '1rem' }}>
                  {currency}{item.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
