import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Receipt, Users, ArrowLeftRight, BarChart3, Settings, Plus, Share2, Sparkles } from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, tripData, setIsAddExpenseModalOpen, setIsLinkedGroupsModalOpen, setIsAIAssistantOpen } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expense History', icon: Receipt },
    { id: 'members', label: 'Trip Members', icon: Users },
    { id: 'settlements', label: 'Settlements', icon: ArrowLeftRight },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings', label: 'Share & Settings', icon: Settings }
  ];

  return (
    <aside style={{
      width: 260,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      flexShrink: 0
    }} className="desktop-only-sidebar">
      {/* Quick Action Button */}
      {tripData && (
        <button
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}
        >
          <Plus size={20} /> Add Expense
        </button>
      )}

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)' : 'transparent',
                color: isActive ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                borderLeft: isActive ? '3px solid var(--accent-emerald)' : '3px solid transparent',
                transition: 'var(--transition)'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Auxiliary Buttons */}
      {tripData && (
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setIsLinkedGroupsModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <Users size={16} color="var(--accent-blue)" /> Family Group Link
          </button>
          
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}
          >
            <Sparkles size={16} color="#a78bfa" /> Ask AI Assistant
          </button>
        </div>
      )}
    </aside>
  );
}
