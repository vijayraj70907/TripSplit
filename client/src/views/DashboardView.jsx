import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DollarSign, Wallet, ArrowUpRight, ArrowDownLeft, Plus, ArrowRight, Activity, TrendingUp, AlertTriangle, Edit3 } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#ec4899', '#06b6d4'];

export default function DashboardView() {
  const { tripData, token, setIsAddExpenseModalOpen, setIsSettlementModalOpen, setSettlementTarget, setActiveTab, user, refreshTripData, showToast } = useApp();
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState('');

  if (!tripData) return null;

  const { trip, members, totalTripExpense, categoryBreakdown, simplifiedSettlements, activityLogs } = tripData;
  const currency = trip.currency;
  const budgetLimit = trip.budget_limit || 50000;
  const budgetPct = Math.min(Math.round((totalTripExpense / budgetLimit) * 100), 100);
  const isBudgetWarning = (totalTripExpense / budgetLimit) >= 0.8;

  const currentMember = members.find(m => m.user_id === user?.id) || members[0];
  const userSpending = currentMember ? currentMember.totalShare : 0;
  const userPaid = currentMember ? currentMember.totalPaid : 0;
  const userNetBalance = currentMember ? currentMember.netBalance : 0;

  const youOwe = simplifiedSettlements
    .filter(s => s.fromId === currentMember.id)
    .reduce((sum, s) => sum + s.amount, 0);

  const youReceive = simplifiedSettlements
    .filter(s => s.toId === currentMember.id)
    .reduce((sum, s) => sum + s.amount, 0);

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    if (!newBudget || parseFloat(newBudget) <= 0) return;

    try {
      const res = await fetch(`/api/trips/${trip.id}/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ budget_limit: parseFloat(newBudget) })
      });
      if (res.ok) {
        showToast('Budget cap updated!', 'success');
        refreshTripData();
        setEditingBudget(false);
      }
    } catch (err) {
      showToast('Budget update failed', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner / Header */}
      <div className="glass-card" style={{
        padding: 24,
        background: `linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.1) 100%), url(${trip.image_url}) center/cover no-repeat`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(11,15,25,0.92) 30%, rgba(11,15,25,0.7) 100%)'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-positive" style={{ letterSpacing: 1 }}>CODE: {trip.code}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {trip.start_date ? `${trip.start_date} to ${trip.end_date}` : 'Ongoing Trip'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#fff' }}>{trip.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4, maxWidth: 600 }}>
              {trip.description || 'Welcome to your trip dashboard. Manage group spending seamlessly!'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="btn btn-primary btn-lg"
              style={{ boxShadow: 'var(--shadow-glow)' }}
            >
              <Plus size={20} /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Budget Limit & Spending Cap Meter Card */}
      <div className="glass-card" style={{ padding: 18, borderLeft: `4px solid ${isBudgetWarning ? 'var(--accent-rose)' : 'var(--accent-emerald)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Trip Budget Cap: {currency}{totalTripExpense.toLocaleString()} / {currency}{budgetLimit.toLocaleString()}
            </span>
            {isBudgetWarning && (
              <span className="badge badge-negative" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={14} /> {budgetPct >= 100 ? 'Budget Exceeded!' : 'High Spending Warning!'}
              </span>
            )}
          </div>

          {!editingBudget ? (
            <button onClick={() => { setNewBudget(budgetLimit.toString()); setEditingBudget(true); }} className="btn btn-secondary btn-sm">
              <Edit3 size={14} /> Set Cap
            </button>
          ) : (
            <form onSubmit={handleUpdateBudget} style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                required
                className="form-input"
                style={{ width: 100, padding: '2px 8px', fontSize: '0.85rem' }}
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button onClick={() => setEditingBudget(false)} className="btn btn-secondary btn-sm">X</button>
            </form>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--bg-primary)', overflow: 'hidden' }}>
          <div style={{
            width: `${budgetPct}%`,
            height: '100%',
            borderRadius: 5,
            background: budgetPct >= 100 ? 'linear-gradient(90deg, #f43f5e, #e11d48)' : budgetPct >= 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #059669)',
            transition: 'width 0.4s ease'
          }}></div>
        </div>
      </div>

      {/* 5 Main Stat Cards */}
      <div className="grid-cols-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Trip Expenses</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="var(--accent-blue)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {currency}{totalTripExpense.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Across {tripData.totalExpensesCount || 0} expenses
          </span>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Share</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="var(--accent-purple)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {currency}{userSpending.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Paid upfront: {currency}{userPaid.toLocaleString()}
          </span>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Balance</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: userNetBalance >= 0 ? 'var(--badge-positive-bg)' : 'var(--badge-negative-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color={userNetBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: userNetBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {userNetBalance >= 0 ? '+' : ''}{currency}{userNetBalance.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: userNetBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
            {userNetBalance >= 0 ? 'Overall in credit' : 'Overall in debt'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>You Owe</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--badge-negative-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={18} color="var(--accent-rose)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
            {currency}{youOwe.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>To settle pending debt</span>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>You Should Receive</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--badge-positive-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownLeft size={18} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {currency}{youReceive.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>From group members</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid-cols-2" style={{ gap: 20 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Simplified Settlement Plan</h3>
            <button onClick={() => setActiveTab('settlements')} className="btn btn-secondary btn-sm">
              View All <ArrowRight size={14} />
            </button>
          </div>

          {simplifiedSettlements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              🎉 All settled up! No transactions needed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {simplifiedSettlements.slice(0, 4).map((s, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-primary)',
                  padding: '12px 14px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>{s.fromName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pays</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{s.toName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {currency}{s.amount}
                    </span>
                    <button
                      onClick={() => { setSettlementTarget(s); setIsSettlementModalOpen(true); }}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 14 }}>
            Spending Breakdown by Category
          </h3>
          {categoryBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              No expenses recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <div style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${currency}${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 180 }}>
                {categoryBreakdown.slice(0, 5).map((cb, idx) => (
                  <div key={cb.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></div>
                      <span style={{ color: 'var(--text-secondary)' }}>{cb.category}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{cb.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="var(--accent-blue)" /> Recent Trip Activity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activityLogs.slice(0, 6).map(log => (
            <div key={log.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-primary)',
              fontSize: '0.88rem'
            }}>
              <div>
                <strong style={{ color: 'var(--accent-emerald)' }}>{log.user_name}</strong> {log.details}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
