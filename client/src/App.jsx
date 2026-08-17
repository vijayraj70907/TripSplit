import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Sidebar from './components/Sidebar';

import AuthModal from './components/AuthModal';
import CreateTripModal from './components/CreateTripModal';
import JoinTripModal from './components/JoinTripModal';
import AddExpenseModal from './components/AddExpenseModal';
import LinkedGroupsModal from './components/LinkedGroupsModal';
import AIAssistantModal from './components/AIAssistantModal';
import SettlementModal from './components/SettlementModal';
import NotificationToast from './components/NotificationToast';
import UserProfileModal from './components/UserProfileModal';

import DashboardView from './views/DashboardView';
import ExpensesView from './views/ExpensesView';
import MembersView from './views/MembersView';
import SettlementsView from './views/SettlementsView';
import ReportsView from './views/ReportsView';
import TripSettingsView from './views/TripSettingsView';

import { Plane, Plus, Link2 } from 'lucide-react';

export default function App() {
  const { user, tripData, loadingTrip, activeTab, setIsCreateTripModalOpen, setIsJoinTripModalOpen, setIsAuthModalOpen } = useApp();

  // Check URL join parameters on page load or after successful authentication
  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      if (joinCode) {
        setIsJoinTripModalOpen(true);
      }
    }
  }, [user]);

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <NotificationToast />

      {/* Main Container */}
      <div className="main-content">
        <Navbar />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Desktop Sidebar */}
          {user && tripData && <Sidebar />}

          {/* View Container */}
          <main className="view-container" style={{ flex: 1 }}>
            {!user ? (
              // Unauthenticated Landing View
              <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 640, margin: '40px auto' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  margin: '0 auto 20px auto',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)'
                }}>
                  <Plane size={32} />
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>Welcome to TripSplit</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: 28 }}>
                  Smart group expense manager for trips with friends, family, and couples. Automatic debt calculation, family group linking, and real-time collaboration.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                  <button onClick={() => setIsAuthModalOpen(true)} className="btn btn-primary btn-lg">
                    Get Started / Sign In
                  </button>
                </div>
              </div>
            ) : !tripData ? (
              // Authenticated but no active trip selected
              <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 540, margin: '40px auto' }}>
                <h2 style={{ fontSize: '1.6rem', marginBottom: 10 }}>No Active Trip Selected</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                  Create a new trip or join an existing one with your invite code!
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                  <button onClick={() => setIsCreateTripModalOpen(true)} className="btn btn-primary">
                    <Plus size={18} /> Create Trip
                  </button>
                  <button onClick={() => setIsJoinTripModalOpen(true)} className="btn btn-secondary">
                    <Link2 size={18} /> Join via Code
                  </button>
                </div>
              </div>
            ) : (
              // Active Trip Views
              <>
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'expenses' && <ExpensesView />}
                {activeTab === 'members' && <MembersView />}
                {activeTab === 'settlements' && <SettlementsView />}
                {activeTab === 'reports' && <ReportsView />}
                {activeTab === 'settings' && <TripSettingsView />}
              </>
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {user && tripData && <MobileNav />}
      </div>

      {/* Modals */}
      <AuthModal />
      <CreateTripModal />
      <JoinTripModal />
      <AddExpenseModal />
      <LinkedGroupsModal />
      <AIAssistantModal />
      <SettlementModal />
      <UserProfileModal />
    </div>
  );
}
