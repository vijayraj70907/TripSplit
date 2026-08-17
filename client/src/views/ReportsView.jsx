import React from 'react';
import { useApp } from '../context/AppContext';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BarChart3, Download, Printer, Award, TrendingUp, DollarSign } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#ec4899', '#06b6d4'];

export default function ReportsView() {
  const { tripData, token } = useApp();

  if (!tripData) return null;
  const { trip, members, totalTripExpense, categoryBreakdown, totalExpensesCount } = tripData;
  const currency = trip.currency;

  // Highest Payer
  const highestPayer = [...members].sort((a, b) => b.totalPaid - a.totalPaid)[0];

  // Highest Share / Spender
  const highestSpender = [...members].sort((a, b) => b.totalShare - a.totalShare)[0];

  const handleExportCSV = () => {
    window.open(`/api/reports/export-csv?tripId=${trip.id}&token=${token}`, '_blank');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Trip Analytics & Report</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Financial summary and category insights for {trip.name}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={18} /> Export CSV / Excel
          </button>
          <button onClick={handlePrintPDF} className="btn btn-primary">
            <Printer size={18} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Top Highlight Cards */}
      <div className="grid-cols-2" style={{ gap: 16 }}>
        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--badge-positive-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} color="var(--accent-emerald)" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Upfront Payer</div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{highestPayer?.display_name || 'N/A'}</h3>
              <span style={{ fontSize: '0.88rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                Paid {currency}{highestPayer?.totalPaid || 0} upfront
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="var(--accent-purple)" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Expense Share</div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{highestSpender?.display_name || 'N/A'}</h3>
              <span style={{ fontSize: '0.88rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                Total share: {currency}{highestSpender?.totalShare || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Member Spending Bar Chart */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 16 }}>
          Member Spending & Payments Comparison ({currency})
        </h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={members}>
              <XAxis dataKey="display_name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip formatter={(value) => `${currency}${value}`} />
              <Legend />
              <Bar dataKey="totalPaid" name="Total Paid Upfront" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalShare" name="Total Expense Share" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 14 }}>
          Category-wise Expense Breakdown
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categoryBreakdown.map((cb, idx) => (
            <div key={cb.category} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--bg-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{cb.category}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cb.percentage}% of total</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {currency}{cb.amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
