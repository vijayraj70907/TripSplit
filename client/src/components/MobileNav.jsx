import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Receipt, Users, ArrowLeftRight, BarChart3, Settings } from 'lucide-react';

export default function MobileNav() {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settlements', label: 'Settlement', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'var(--bg-secondary)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 90
    }} className="mobile-only-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? 'var(--accent-emerald)' : 'var(--text-muted)',
              cursor: 'pointer',
              flex: 1,
              padding: '6px 0'
            }}
          >
            <Icon size={20} color={isActive ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.72rem', fontWeight: isActive ? 700 : 500 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
