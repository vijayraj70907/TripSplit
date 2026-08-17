import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, MapPin, Calendar, DollarSign, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function CreateTripModal() {
  const { isCreateTripModalOpen, setIsCreateTripModalOpen, token, fetchMyTrips, showToast, selectTrip } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    currency: '₹',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isCreateTripModalOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Trip "${data.trip.name}" created! Code: ${data.trip.code} 🎉`, 'success');
        await fetchMyTrips();
        selectTrip(data.trip.id);
        setIsCreateTripModalOpen(false);
      } else {
        showToast(data.error || 'Failed to create trip', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin color="var(--accent-emerald)" /> Create New Trip
          </h3>
          <button onClick={() => setIsCreateTripModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Trip Name *</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Goa Trip 2026, Manali Trek, Paris Vacation"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                name="start_date"
                className="form-input"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                name="end_date"
                className="form-input"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <select name="currency" className="form-select" value={formData.currency} onChange={handleChange}>
                <option value="₹">₹ (INR - Rupee)</option>
                <option value="$">$ (USD - Dollar)</option>
                <option value="€">€ (EUR - Euro)</option>
                <option value="£">£ (GBP - Pound)</option>
                <option value="AED">AED (Dirham)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image URL (Optional)</label>
              <input
                type="url"
                name="image_url"
                placeholder="https://images.unsplash.com/..."
                className="form-input"
                value={formData.image_url}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Notes</label>
            <textarea
              name="description"
              rows="3"
              placeholder="Add details about your itinerary, accommodation, or trip notes..."
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
            <button type="button" onClick={() => setIsCreateTripModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
