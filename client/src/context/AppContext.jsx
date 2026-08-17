import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tripsplit_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('tripsplit_token') || null);
  const [theme, setTheme] = useState(() => localStorage.getItem('tripsplit_theme') || 'dark');
  const [myTrips, setMyTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(() => localStorage.getItem('tripsplit_trip_id') || null);
  const [tripData, setTripData] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isJoinTripModalOpen, setIsJoinTripModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isLinkedGroupsModalOpen, setIsLinkedGroupsModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `${theme}-theme`;
    localStorage.setItem('tripsplit_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Socket.IO Initialization
  useEffect(() => {
    const newSocket = io(window.location.origin, {
      reconnectionAttempts: 5
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch User's Trips on Login
  useEffect(() => {
    if (token) {
      fetchMyTrips();
    } else {
      setMyTrips([]);
      setTripData(null);
    }
  }, [token]);

  const fetchMyTrips = async () => {
    try {
      const res = await fetch('/api/trips/my-trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyTrips(data.trips);
        if (data.trips.length > 0) {
          const defaultTripId = currentTripId && data.trips.some(t => t.id === currentTripId)
            ? currentTripId
            : data.trips[0].id;
          selectTrip(defaultTripId);
        } else {
          setCurrentTripId(null);
          setTripData(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user trips:', err);
    }
  };

  const selectTrip = (tripId) => {
    setCurrentTripId(tripId);
    localStorage.setItem('tripsplit_trip_id', tripId);
    if (socket) {
      socket.emit('JOIN_TRIP', tripId);
    }
  };

  // Fetch Trip Details & Summary
  const refreshTripData = async () => {
    if (!currentTripId || !token) return;
    setLoadingTrip(true);
    try {
      const res = await fetch(`/api/trips/${currentTripId}/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTripData(data);
      } else if (res.status === 403) {
        showToast('You are not authorized to view this trip', 'error');
      }
    } catch (err) {
      console.error('Error loading trip summary:', err);
    } finally {
      setLoadingTrip(false);
    }
  };

  useEffect(() => {
    if (currentTripId && token) {
      refreshTripData();
    }
  }, [currentTripId, token]);

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket || !currentTripId) return;

    socket.emit('JOIN_TRIP', currentTripId);

    const handleExpenseUpdated = (data) => {
      showToast(`Expense updated: ${data.title}`, 'info');
      refreshTripData();
    };

    const handleMemberJoined = (data) => {
      showToast(`${data.displayName} joined the trip! 🎉`, 'success');
      refreshTripData();
    };

    const handleSettlementRecorded = (data) => {
      showToast(`Payment recorded: ${data.payerName} paid ${data.payeeName} ₹${data.amount} 💰`, 'success');
      refreshTripData();
    };

    const handleLinkedGroupUpdated = () => {
      showToast('Linked Family Groups updated', 'info');
      refreshTripData();
    };

    socket.on('EXPENSE_UPDATED', handleExpenseUpdated);
    socket.on('MEMBER_JOINED', handleMemberJoined);
    socket.on('MEMBER_ADDED', handleMemberJoined);
    socket.on('SETTLEMENT_RECORDED', handleSettlementRecorded);
    socket.on('LINKED_GROUP_UPDATED', handleLinkedGroupUpdated);

    return () => {
      socket.off('EXPENSE_UPDATED', handleExpenseUpdated);
      socket.off('MEMBER_JOINED', handleMemberJoined);
      socket.off('MEMBER_ADDED', handleMemberJoined);
      socket.off('SETTLEMENT_RECORDED', handleSettlementRecorded);
      socket.off('LINKED_GROUP_UPDATED', handleLinkedGroupUpdated);
    };
  }, [socket, currentTripId]);

  // Auth Operations
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('tripsplit_user', JSON.stringify(userData));
    localStorage.setItem('tripsplit_token', userToken);
    setIsAuthModalOpen(false);
    showToast(`Welcome back, ${userData.name}!`, 'success');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setTripData(null);
    setMyTrips([]);
    setCurrentTripId(null);
    localStorage.removeItem('tripsplit_user');
    localStorage.removeItem('tripsplit_token');
    localStorage.removeItem('tripsplit_trip_id');
    showToast('Logged out successfully', 'info');
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      theme,
      toggleTheme,
      myTrips,
      currentTripId,
      tripData,
      loadingTrip,
      activeTab,
      setActiveTab,
      toasts,
      showToast,
      selectTrip,
      refreshTripData,
      fetchMyTrips,
      login,
      logout,

      // Modals controls
      isAuthModalOpen, setIsAuthModalOpen,
      isCreateTripModalOpen, setIsCreateTripModalOpen,
      isJoinTripModalOpen, setIsJoinTripModalOpen,
      isAddExpenseModalOpen, setIsAddExpenseModalOpen,
      editingExpense, setEditingExpense,
      isLinkedGroupsModalOpen, setIsLinkedGroupsModalOpen,
      isAIAssistantOpen, setIsAIAssistantOpen,
      isSettlementModalOpen, setIsSettlementModalOpen,
      settlementTarget, setSettlementTarget,
      isProfileModalOpen, setIsProfileModalOpen
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
