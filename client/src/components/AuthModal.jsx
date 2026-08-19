import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, Lock, User, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, showToast } = useApp();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
        } else {
          showToast(data.error || 'Login failed', 'error');
        }
      } else if (tab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
        } else {
          showToast(data.error || 'Sign up failed', 'error');
        }
      } else if (tab === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, newPassword: formData.newPassword })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message, 'success');
          setTab('login');
        } else {
          showToast(data.error || 'Password reset failed', 'error');
        }
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem' }}>
            {tab === 'login' && 'Sign In to TripSplit'}
            {tab === 'register' && 'Create Your Account'}
            {tab === 'forgot' && 'Reset Your Password'}
          </h3>
          <button onClick={() => setIsAuthModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter your name"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {tab === 'forgot' && (
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  required
                  placeholder="Enter new password"
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 10, padding: 12 }}
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Reset Password'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: '0.85rem' }}>
            {tab === 'login' ? (
              <>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); setTab('forgot'); }} style={{ color: 'var(--accent-emerald)', textDecoration: 'none' }}>
                  Forgot Password?
                </a>
                <a href="#register" onClick={(e) => { e.preventDefault(); setTab('register'); }} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                  New here? Sign Up
                </a>
              </>
            ) : (
              <a href="#login" onClick={(e) => { e.preventDefault(); setTab('login'); }} style={{ color: 'var(--accent-emerald)', textDecoration: 'none', margin: '0 auto' }}>
                Already have an account? Sign In
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
