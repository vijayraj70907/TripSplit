import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ExpenseCommentsModal from '../components/ExpenseCommentsModal';
import { Search, Plus, Edit2, Trash2, Image as ImageIcon, Receipt, MessageSquare, Repeat, Globe, FileText } from 'lucide-react';

const CATEGORIES = ['All', 'Food', 'Hotel', 'Transport', 'Fuel', 'Tickets', 'Shopping', 'Activities', 'Drinks', 'Parking', 'Other'];

export default function ExpensesView() {
  const { tripData, token, setIsAddExpenseModalOpen, setEditingExpense, refreshTripData, showToast } = useApp();
  const currentMemberId = tripData?.currentMember?.member_id;
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPayer, setSelectedPayer] = useState('All');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedExpenseForComments, setSelectedExpenseForComments] = useState(null);

  const fetchExpenses = async () => {
    if (!tripData) return;
    try {
      const queryParams = new URLSearchParams({
        tripId: tripData.trip.id,
        search,
        category: selectedCategory,
        paidBy: selectedPayer
      });

      const res = await fetch(`/api/expenses?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [tripData, search, selectedCategory, selectedPayer]);

  if (!tripData) return null;
  const currency = tripData.trip.currency;

  const handleDeleteExpense = async (expId, title) => {
    if (!window.confirm(`Delete expense "${title}"?`)) return;

    try {
      const res = await fetch(`/api/expenses/${expId}?tripId=${tripData.trip.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Expense deleted', 'info');
        refreshTripData();
        fetchExpenses();
      }
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const handleDownloadPDF = () => {
    if (!tripData) return;
    const { trip, members } = tripData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked! Please allow popups to download PDF.', 'error');
      return;
    }

    const membersHtml = members.map(m => {
      const isPositive = m.netBalance >= 0;
      const balanceClass = isPositive ? 'positive' : 'negative';
      const balanceSign = isPositive ? '+' : '';
      return `
        <tr>
          <td><strong>${m.display_name}</strong> ${m.role === 'owner' ? '<span class="badge">Owner</span>' : ''}</td>
          <td>${currency}${m.totalPaid.toLocaleString()}</td>
          <td>${currency}${m.totalShare.toLocaleString()}</td>
          <td class="${balanceClass}">${balanceSign}${currency}${m.netBalance.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const expensesHtml = expenses.map(exp => {
      const payerMember = members.find(m => m.id === exp.payers[0]?.member_id);
      const payerName = payerMember ? payerMember.display_name : 'Member';
      return `
        <tr>
          <td>${exp.date}</td>
          <td>
            <strong>${exp.title}</strong>
            ${exp.notes ? `<div class="notes-sub">${exp.notes}</div>` : ''}
          </td>
          <td><span class="category-tag">${exp.category}</span></td>
          <td>${exp.split_method}</td>
          <td>${payerName}</td>
          <td style="font-weight: 700;">${currency}${exp.total_amount.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    let filtersDesc = 'All expenses included.';
    if (selectedCategory !== 'All' || selectedPayer !== 'All' || search) {
      const parts = [];
      if (selectedCategory !== 'All') parts.push(`Category: ${selectedCategory}`);
      if (selectedPayer !== 'All') {
        const m = members.find(x => x.id === Number(selectedPayer));
        parts.push(`Paid by: ${m ? m.display_name : selectedPayer}`);
      }
      if (search) parts.push(`Search: "${search}"`);
      filtersDesc = `Filtered by: ${parts.join(' | ')}`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${trip.name} - Expense Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title-area h1 {
              margin: 0;
              font-size: 2.2rem;
              font-weight: 800;
              color: #1e293b;
              letter-spacing: -0.025em;
            }
            .title-area p {
              margin: 6px 0 0 0;
              color: #64748b;
              font-size: 0.95rem;
            }
            .meta-area {
              text-align: right;
              font-size: 0.88rem;
              color: #64748b;
              line-height: 1.5;
            }
            .section {
              margin-bottom: 35px;
            }
            .section-title {
              font-size: 1.25rem;
              font-weight: 700;
              color: #334155;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .section-title span {
              font-size: 0.88rem;
              font-weight: 400;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 0.75rem;
              letter-spacing: 0.05em;
              padding: 12px 16px;
              border-bottom: 2px solid #e2e8f0;
              text-align: left;
            }
            td {
              padding: 12px 16px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 0.88rem;
              color: #334155;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .badge {
              font-size: 0.7rem;
              padding: 2px 6px;
              background-color: #f1f5f9;
              color: #475569;
              border-radius: 4px;
              font-weight: 500;
              margin-left: 6px;
              vertical-align: middle;
            }
            .category-tag {
              font-size: 0.75rem;
              padding: 4px 8px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              color: #475569;
              border-radius: 6px;
              font-weight: 500;
            }
            .notes-sub {
              font-size: 0.78rem;
              color: #64748b;
              font-style: italic;
              margin-top: 4px;
            }
            .positive {
              color: #10b981;
              font-weight: 600;
            }
            .negative {
              color: #ef4444;
              font-weight: 600;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
              text-align: center;
              font-size: 0.78rem;
              color: #94a3b8;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none !important;
              }
            }
            .btn-print {
              background: #10b981;
              color: white;
              border: none;
              padding: 8px 16px;
              font-size: 0.88rem;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <span style="font-size: 0.88rem; color: #475569;">📄 Print Report Preview. Use your browser's Print dialog to save it directly as a PDF.</span>
            <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
          </div>

          <div class="header">
            <div class="title-area">
              <h1>${trip.name}</h1>
              <p>${trip.description || 'Smart Group Expense Report'}</p>
            </div>
            <div class="meta-area">
              <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Base Currency:</strong> ${trip.currency}</div>
              <div><strong>Budget Limit:</strong> ${trip.currency}${trip.budget_limit.toLocaleString()}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Trip Members &amp; Balances</div>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Total Paid</th>
                  <th>Total Share</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                ${membersHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              Expense History 
              <span>${filtersDesc}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Split Method</th>
                  <th>Paid By</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${expensesHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Generated with TripSplit — Smart Group Expense Manager
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Expense History</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            All expenses recorded in {tripData.trip.name}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleDownloadPDF} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Download PDF Report
          </button>

          <button onClick={() => { setEditingExpense(null); setIsAddExpenseModalOpen(true); }} className="btn btn-primary btn-lg">
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search expenses by title or note..."
              className="form-input"
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
          >
            <option value="All">Paid by: All Members</option>
            {tripData.members.map(m => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--accent-emerald)' : 'var(--border-color)',
                background: selectedCategory === cat ? 'var(--badge-positive-bg)' : 'var(--bg-primary)',
                color: selectedCategory === cat ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                fontWeight: selectedCategory === cat ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Receipt size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3>No expenses found</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>Try adjusting your filters or click "+ Add Expense"</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {expenses.map(exp => {
            const payerMember = tripData.members.find(m => m.id === exp.payers[0]?.member_id);
            const payerName = payerMember ? payerMember.display_name : 'Member';
            const participantCount = exp.participants.length;
            // Only the creator can edit/delete
            const isCreator = !exp.created_by_member_id || exp.created_by_member_id === currentMemberId;

            return (
              <div key={exp.id} className="glass-card" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    {exp.category === 'Food' ? '🍔' : exp.category === 'Hotel' ? '🏨' : exp.category === 'Transport' ? '🚗' : exp.category === 'Fuel' ? '⛽' : exp.category === 'Tickets' ? '🎟️' : exp.category === 'Drinks' ? '🍹' : '💸'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{exp.title}</h4>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{exp.category}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{exp.split_method} Split</span>
                      {exp.is_recurring === 1 && (
                        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', fontSize: '0.75rem' }}>
                          <Repeat size={12} /> Recurring
                        </span>
                      )}
                      {exp.original_currency && exp.original_currency !== 'INR' && (
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.75rem' }}>
                          <Globe size={12} /> {exp.original_currency} converted
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <span>Paid by <strong>{payerName}</strong></span>
                      <span>Shared by <strong>{participantCount} people</strong></span>
                      <span>📅 {exp.date}</span>
                    </div>

                    {exp.notes && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        "{exp.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {currency}{exp.total_amount.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setSelectedExpenseForComments(exp)}
                      className="btn btn-secondary btn-sm"
                      title="Discussion Thread"
                    >
                      <MessageSquare size={16} color="var(--accent-blue)" /> {exp.commentsCount || 0}
                    </button>

                    {exp.receipt_url && (
                      <button
                        onClick={() => setSelectedReceipt(exp.receipt_url)}
                        className="btn btn-secondary btn-sm"
                        title="View Receipt"
                      >
                        <ImageIcon size={16} color="var(--accent-emerald)" />
                      </button>
                    )}

                    {isCreator && (
                      <button
                        onClick={() => { setEditingExpense(exp); setIsAddExpenseModalOpen(true); }}
                        className="btn btn-secondary btn-sm"
                        title="Edit Expense"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {isCreator && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="btn btn-danger btn-sm"
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content" style={{ maxWidth: 500, padding: 10 }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedReceipt} alt="Receipt" style={{ width: '100%', borderRadius: 8 }} />
            <button onClick={() => setSelectedReceipt(null)} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 10 }}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {selectedExpenseForComments && (
        <ExpenseCommentsModal
          expense={selectedExpenseForComments}
          onClose={() => setSelectedExpenseForComments(null)}
        />
      )}
    </div>
  );
}
