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
    newPassword: '',
    securityQuestionSelect: 'What was the name of your first pet?',
    customSecurityQuestion: '',
    securityAnswer: ''
  });
  const [fetchedSecurityQuestion, setFetchedSecurityQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFetchQuestion = async () => {
    if (!formData.email) {
      showToast('Please enter your email first', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/security-question?email=${encodeURIComponent(formData.email)}`);
      const data = await res.json();
      if (res.ok) {
        setFetchedSecurityQuestion(data.securityQuestion);
      } else {
        showToast(data.error || 'User not found', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
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
        const finalQuestion = formData.securityQuestionSelect === 'Other (Custom Question)' 
          ? formData.customSecurityQuestion 
          : formData.securityQuestionSelect;
          
        if (!finalQuestion || !formData.securityAnswer) {
          showToast('Security question and answer are required', 'error');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name, 
            email: formData.email, 
            password: formData.password,
            securityQuestion: finalQuestion,
            securityAnswer: formData.securityAnswer
          })
        });
        const data = await res.json();
        if (res.ok) {
          login(data.user, data.token);
        } else {
          showToast(data.error || 'Sign up failed', 'error');
        }
      } else if (tab === 'forgot') {
        if (!fetchedSecurityQuestion) {
          // If question isn't fetched yet, fetch it instead of submitting form
          await handleFetchQuestion();
          return;
        }

        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            securityAnswer: formData.securityAnswer,
            newPassword: formData.newPassword 
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message, 'success');
          setTab('login');
          setFetchedSecurityQuestion(null);
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
                disabled={tab === 'forgot' && fetchedSecurityQuestion}
                placeholder="Enter your email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <>
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

              {tab === 'register' && (
                <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--text-primary)' }}>Account Recovery</h4>
                  
                  <div className="form-group">
                    <label className="form-label">Security Question</label>
                    <select
                      name="securityQuestionSelect"
                      className="form-select"
                      value={formData.securityQuestionSelect}
                      onChange={handleChange}
                    >
                      <option>What was the name of your first pet?</option>
                      <option>In what city were you born?</option>
                      <option>What is your mother's maiden name?</option>
                      <option>Other (Custom Question)</option>
                    </select>
                  </div>

                  {formData.securityQuestionSelect === 'Other (Custom Question)' && (
                    <div className="form-group">
                      <label className="form-label">Custom Question</label>
                      <input
                        type="text"
                        name="customSecurityQuestion"
                        required
                        placeholder="e.g. What is my favorite movie?"
                        className="form-input"
                        value={formData.customSecurityQuestion}
                        onChange={handleChange}
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Answer</label>
                    <input
                      type="text"
                      name="securityAnswer"
                      required
                      placeholder="Your secret answer"
                      className="form-input"
                      value={formData.securityAnswer}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'forgot' && fetchedSecurityQuestion && (
            <>
              <div className="form-group" style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <label className="form-label" style={{ color: 'var(--accent-emerald)' }}>Security Question</label>
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 12 }}>{fetchedSecurityQuestion}</p>
                <input
                  type="text"
                  name="securityAnswer"
                  required
                  placeholder="Enter your answer"
                  className="form-input"
                  value={formData.securityAnswer}
                  onChange={handleChange}
                />
              </div>

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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 10, padding: 12 }}
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : tab === 'forgot' && !fetchedSecurityQuestion ? 'Next' : 'Reset Password'}
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
