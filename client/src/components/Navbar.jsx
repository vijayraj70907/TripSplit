import React from 'react';
import { useApp } from '../context/AppContext';
import { Plane, Plus, UserCheck, Sparkles, Sun, Moon, LogIn, LogOut, ChevronDown, User } from 'lucide-react';

export default function Navbar() {
  const {
    user,
    theme,
    toggleTheme,
    myTrips,
    tripData,
    currentTripId,
    selectTrip,
    setIsAuthModalOpen,
    setIsCreateTripModalOpen,
    setIsJoinTripModalOpen,
    setIsAIAssistantOpen,
    setIsProfileModalOpen,
    logout
  } = useApp();

  return (
    <header className="glass-card" style={{
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 20px'
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
          }}>
            <Plane size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TripSplit
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginTop: -2 }}>
              Smart Group Expense
            </span>
          </div>
        </div>

        {/* Active Trip Selector Dropdown */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <select
                value={currentTripId || ''}
                onChange={(e) => {
                  if (e.target.value === 'CREATE') {
                    setIsCreateTripModalOpen(true);
                  } else if (e.target.value === 'JOIN') {
                    setIsJoinTripModalOpen(true);
                  } else {
                    selectTrip(e.target.value);
                  }
                }}
                className="form-select"
                style={{
                  paddingRight: 32,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  maxWidth: 220,
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer'
                }}
              >
                {myTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    ✈️ {t.name} ({t.currency})
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value="CREATE">+ Create New Trip</option>
                <option value="JOIN">🔗 Join via Code</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateTripModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Create New Trip"
              style={{ display: 'none' }}
            >
              <Plus size={16} /> New
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* AI Assistant Button */}
          {user && tripData && (
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="btn btn-accent btn-sm"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            >
              <Sparkles size={16} /> AI Assistant
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ width: 36, height: 36, padding: 0, borderRadius: '50%' }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* Auth Menu */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                title="View Profile Account"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                  alt={user.name}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--accent-emerald)' }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'none' }}>
                  {user.name}
                </span>
              </div>
              <button
                onClick={logout}
                className="btn btn-secondary btn-sm"
                title="Logout"
                style={{ padding: '6px 10px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <LogIn size={16} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
