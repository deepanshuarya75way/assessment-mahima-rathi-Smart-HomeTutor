import React, { useState } from 'react';
import { tutorApi } from '../../../services/tutorApi';

export const PayoutModal = ({ isOpen, onClose, availableBalance = 0, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid payout amount.');
      return;
    }
    if (numericAmount > availableBalance) {
      setError(`Payout amount cannot exceed available balance of ₹${availableBalance.toFixed(2)}.`);
      return;
    }
    if (!upiId.trim()) {
      setError('Please enter your UPI ID or Bank Account details.');
      return;
    }

    setLoading(true);
    try {
      const res = await tutorApi.requestPayout(numericAmount, upiId.trim());
      if (res.success) {
        setSuccess('Payout request submitted successfully! Funds will be transferred to your account within 24 hours.');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
          setAmount('');
          setUpiId('');
          setSuccess('');
        }, 2000);
      } else {
        setError(res.message || 'Failed to submit payout request.');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tr-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="tr-modal-card" style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#64748b',
            cursor: 'pointer'
          }}
        >
          &times;
        </button>

        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f2a4a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#0284c7' }}></i> Request Payout Transfer
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
          Transfer your available teaching earnings directly to your UPI ID or Bank Account.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Available Balance
            </label>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>
              ₹{availableBalance.toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Payout Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              UPI ID or Bank Account Details <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. tutor@upi or HDFC Bank Account No / IFSC"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn dash-btn-accent"
              disabled={loading}
            >
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : 'Submit Payout Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
