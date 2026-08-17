import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Receipt, DollarSign, Repeat, Globe } from 'lucide-react';

const CATEGORIES = [
  'Food', 'Hotel', 'Transport', 'Fuel', 'Tickets',
  'Shopping', 'Activities', 'Drinks', 'Parking', 'Other'
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', rate: 1 },
  { code: 'USD', symbol: '$', rate: 83.5 },
  { code: 'EUR', symbol: '€', rate: 90.2 },
  { code: 'GBP', symbol: '£', rate: 105.8 },
  { code: 'AED', symbol: 'AED', rate: 22.7 }
];

export default function AddExpenseModal() {
  const {
    isAddExpenseModalOpen,
    setIsAddExpenseModalOpen,
    editingExpense,
    setEditingExpense,
    tripData,
    token,
    showToast,
    refreshTripData
  } = useApp();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [payerId, setPayerId] = useState('');
  const [participantState, setParticipantState] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tripData || !tripData.members.length) return;

    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.total_amount.toString());
      setDate(editingExpense.date);
      setCategory(editingExpense.category);
      setSplitMethod(editingExpense.split_method);
      setNotes(editingExpense.notes || '');
      setReceiptUrl(editingExpense.receipt_url || '');
      setCurrencyCode(editingExpense.original_currency || 'INR');
      setExchangeRate(editingExpense.exchange_rate || 1);
      setIsRecurring(!!editingExpense.is_recurring);

      const firstPayer = editingExpense.payers?.[0]?.member_id || tripData.members[0].id;
      setPayerId(firstPayer);

      const partMap = {};
      tripData.members.forEach(m => {
        const existingPt = editingExpense.participants?.find(p => p.member_id === m.id);
        partMap[m.id] = {
          selected: !!existingPt,
          percentage: existingPt?.percentage || 0,
          custom: existingPt?.custom_amount || 0
        };
      });
      setParticipantState(partMap);
    } else {
      setTitle('');
      setAmount('');
      setCurrencyCode('INR');
      setExchangeRate(1);
      setIsRecurring(false);
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setSplitMethod('equal');
      setNotes('');
      setReceiptUrl('');

      // Auto-select logged-in user as payer using currentMember.user_id
      const currentUserId = tripData.currentMember?.user_id;
      const userMember = tripData.members.find(m => m.user_id === currentUserId) || tripData.members[0];
      setPayerId(userMember.id);

      const partMap = {};
      const equalPct = Math.round(100 / tripData.members.length);
      tripData.members.forEach(m => {
        partMap[m.id] = {
          selected: true,
          percentage: equalPct,
          custom: 0
        };
      });
      setParticipantState(partMap);
    }
  }, [isAddExpenseModalOpen, editingExpense, tripData]);

  if (!isAddExpenseModalOpen || !tripData) return null;

  const handleCurrencyChange = (code) => {
    setCurrencyCode(code);
    const curr = CURRENCIES.find(c => c.code === code);
    if (curr) {
      setExchangeRate(curr.rate);
    }
  };

  const handleToggleParticipant = (mId) => {
    setParticipantState(prev => ({
      ...prev,
      [mId]: {
        ...prev[mId],
        selected: !prev[mId].selected
      }
    }));
  };

  const handleCustomChange = (mId, val) => {
    setParticipantState(prev => ({
      ...prev,
      [mId]: { ...prev[mId], custom: val }
    }));
  };

  const handlePercentageChange = (mId, val) => {
    setParticipantState(prev => ({
      ...prev,
      [mId]: { ...prev[mId], percentage: val }
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setReceiptUrl(data.receiptUrl);
        showToast('Receipt photo attached! 📄', 'success');
      }
    } catch (err) {
      showToast('Receipt upload failed', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawInputAmount = parseFloat(amount);
    if (!title || !rawInputAmount || rawInputAmount <= 0) {
      showToast('Please enter a valid title and amount', 'error');
      return;
    }

    // Auto convert multi-currency input to trip base currency
    const convertedTotalAmount = Math.round((rawInputAmount * exchangeRate) * 100) / 100;

    const activeParticipants = Object.entries(participantState)
      .filter(([_, data]) => data.selected)
      .map(([mId, data]) => ({
        member_id: Number(mId),
        percentage: parseFloat(data.percentage || 0),
        custom_amount: parseFloat(data.custom || 0)
      }));

    if (!activeParticipants.length) {
      showToast('At least one member must participate', 'error');
      return;
    }

    if (splitMethod === 'percentage') {
      const totalPct = activeParticipants.reduce((sum, p) => sum + p.percentage, 0);
      if (Math.abs(totalPct - 100) > 1) {
        showToast(`Percentage total must equal 100% (current: ${totalPct}%)`, 'error');
        return;
      }
    }

    setLoading(true);

    const payload = {
      tripId: tripData.trip.id,
      title,
      total_amount: convertedTotalAmount,
      date,
      category,
      split_method: splitMethod,
      notes,
      receipt_url: receiptUrl,
      original_currency: currencyCode,
      exchange_rate: exchangeRate,
      is_recurring: isRecurring ? 1 : 0,
      payers: [{ member_id: Number(payerId), amount_paid: convertedTotalAmount }],
      participants: activeParticipants
    };

    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editingExpense ? 'Expense updated!' : 'Expense saved successfully! 💰', 'success');
        refreshTripData();
        setIsAddExpenseModalOpen(false);
        setEditingExpense(null);
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeCount = Object.values(participantState).filter(p => p.selected).length;
  const convertedPreview = amount ? (parseFloat(amount) * exchangeRate).toFixed(2) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt color="var(--accent-emerald)" /> {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <button onClick={() => { setIsAddExpenseModalOpen(false); setEditingExpense(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Expense Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dinner at Baga, Taxi, Hotel"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Amount & Multi-Currency Converter */}
          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Amount & Currency</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="form-select"
                  style={{ width: 90 }}
                  value={currencyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} ({c.code})</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              {currencyCode !== 'INR' && amount > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: 4, display: 'block' }}>
                  ≈ {tripData.trip.currency}{convertedPreview} (Rate: 1 {currencyCode} = {exchangeRate} {tripData.trip.currency})
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Paid By</label>
              <select className="form-select" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {tripData.members.map(m => (
                  <option key={m.id} value={m.id}>👤 {m.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div className="form-group">
            <label className="form-label">Split Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                { id: 'equal', label: 'Equal' },
                { id: 'select', label: 'Select' },
                { id: 'custom', label: 'Custom' },
                { id: 'percentage', label: '%' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSplitMethod(m.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: splitMethod === m.id ? 'var(--accent-emerald)' : 'var(--border-color)',
                    background: splitMethod === m.id ? 'var(--badge-positive-bg)' : 'var(--bg-primary)',
                    color: splitMethod === m.id ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Table */}
          <div className="form-group">
            <label className="form-label">Split Between ({activeCount} People)</label>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: 10, maxHeight: 160, overflowY: 'auto' }}>
              {tripData.members.map(m => {
                const pt = participantState[m.id] || { selected: true, percentage: 0, custom: 0 };
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: pt.selected ? 'rgba(255,255,255,0.03)' : 'transparent', marginBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={pt.selected}
                        onChange={() => handleToggleParticipant(m.id)}
                        style={{ accentColor: 'var(--accent-emerald)' }}
                      />
                      <span style={{ fontSize: '0.88rem', opacity: pt.selected ? 1 : 0.5 }}>{m.display_name}</span>
                    </label>

                    {pt.selected && splitMethod === 'custom' && (
                      <input
                        type="number"
                        placeholder="Amount"
                        className="form-input"
                        style={{ width: 90, padding: '4px 8px', fontSize: '0.82rem' }}
                        value={pt.custom || ''}
                        onChange={(e) => handleCustomChange(m.id, e.target.value)}
                      />
                    )}

                    {pt.selected && splitMethod === 'percentage' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          placeholder="%"
                          className="form-input"
                          style={{ width: 65, padding: '4px 8px', fontSize: '0.82rem' }}
                          value={pt.percentage || ''}
                          onChange={(e) => handlePercentageChange(m.id, e.target.value)}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options: Recurring Checkbox & Notes */}
          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Details..."
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Receipt</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ accentColor: 'var(--accent-emerald)', width: 16, height: 16 }}
              />
              <Repeat size={16} color="var(--accent-purple)" /> Mark as Daily/Weekly Recurring Expense
            </label>
          </div>

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
            <button type="button" onClick={() => { setIsAddExpenseModalOpen(false); setEditingExpense(null); }} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
