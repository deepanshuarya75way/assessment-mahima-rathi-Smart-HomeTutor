import React, { useState } from 'react';
import { loadRazorpaySdk } from '../../../utils/razorpayLoader';
import { studentApi } from '../../../services/studentApi';

export const TopupWalletModal = ({ isOpen, onClose, walletBalance = 0, onSuccess }) => {
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleAmountSelect = (val) => {
    setIsCustom(false);
    setSelectedAmount(val);
    setCustomAmount('');
    setStatusMsg({ type: '', text: '' });
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    setIsCustom(true);
    setStatusMsg({ type: '', text: '' });
  };

  const getEffectiveAmount = () => {
    if (isCustom) {
      return Number(customAmount) || 0;
    }
    return Number(selectedAmount) || 0;
  };

  const handleProceedPayment = async () => {
    const amountToTopup = getEffectiveAmount();

    if (!amountToTopup || amountToTopup < 10) {
      setStatusMsg({ type: 'error', text: 'Minimum wallet top-up amount is ₹10.' });
      return;
    }

    if (amountToTopup > 1000000) {
      setStatusMsg({ type: 'error', text: 'Maximum single top-up limit is ₹10,00,000.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Initializing Razorpay Checkout...' });

    try {
      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded) {
        setLoading(false);
        setStatusMsg({ type: 'error', text: 'Failed to load Razorpay SDK. Check internet connection.' });
        return;
      }

      // 1. Create Razorpay Payment Order Server-side
      const orderRes = await studentApi.createPaymentOrder({
        amount: amountToTopup,
        paymentType: 'Wallet Topup',
      });

      if (!orderRes || !orderRes.success) {
        setLoading(false);
        setStatusMsg({ type: 'error', text: orderRes?.message || 'Failed to create payment order.' });
        return;
      }

      // 2. Open Razorpay Checkout Window
      const options = {
        key: orderRes.key_id || 'rzp_test_HomeTutorKey',
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'Smart HomeTutor Wallet Topup',
        description: `Add ₹${amountToTopup} Credits to Smart Wallet`,
        order_id: orderRes.orderId,
        handler: async (response) => {
          setStatusMsg({ type: 'info', text: 'Verifying payment with server...' });
          try {
            const verifyRes = await studentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id || orderRes.orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_topup_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'simulated_signature',
              paymentType: 'Wallet Topup',
              amount: amountToTopup,
            });

            setLoading(false);

            if (verifyRes && verifyRes.success) {
              const newBal = verifyRes.walletBalance !== undefined ? verifyRes.walletBalance : (walletBalance + amountToTopup);
              setStatusMsg({ type: 'success', text: `₹${amountToTopup} credited to your Smart Wallet!` });
              if (onSuccess) onSuccess(newBal, `₹${amountToTopup} added to your Smart Wallet!`);
              setTimeout(() => {
                onClose();
                setStatusMsg({ type: '', text: '' });
              }, 1800);
            } else {
              setStatusMsg({ type: 'error', text: verifyRes?.message || 'Payment verification failed.' });
            }
          } catch (err) {
            console.error('Verify Topup Error:', err);
            setLoading(false);
            setStatusMsg({ type: 'error', text: 'Error verifying payment signature.' });
          }
        },
        modal: {
          ondismiss: async () => {
            setLoading(false);
            setStatusMsg({ type: 'error', text: 'Top-up cancelled by user. No funds were debited.' });
            try {
              await studentApi.recordPaymentCancel({ razorpay_order_id: orderRes.orderId, reason: 'Wallet top-up cancelled by user.' });
            } catch (err) {
              console.error('Cancel record error:', err);
            }
          },
        },
        prefill: {
          name: 'Student',
        },
        theme: {
          color: '#0284c7',
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async (resp) => {
          setLoading(false);
          const reason = resp.error ? resp.error.description : 'Payment Failed.';
          setStatusMsg({ type: 'error', text: `Payment Failed: ${reason}` });
        });
        rzp.open();
      } else {
        // Dev Simulation Fallback
        const verifyRes = await studentApi.verifyPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'simulated_signature',
          paymentType: 'Wallet Topup',
          amount: amountToTopup,
        });

        setLoading(false);
        if (verifyRes && verifyRes.success) {
          const newBal = verifyRes.walletBalance !== undefined ? verifyRes.walletBalance : (walletBalance + amountToTopup);
          setStatusMsg({ type: 'success', text: `₹${amountToTopup} credited to Smart Wallet (Simulated)!` });
          if (onSuccess) onSuccess(newBal, `₹${amountToTopup} added to Smart Wallet!`);
          setTimeout(() => {
            onClose();
            setStatusMsg({ type: '', text: '' });
          }, 1800);
        } else {
          setStatusMsg({ type: 'error', text: verifyRes?.message || 'Payment simulation failed.' });
        }
      }
    } catch (err) {
      console.error('Topup Payment Error:', err);
      setLoading(false);
      setStatusMsg({ type: 'error', text: 'Server error during payment initialization.' });
    }
  };

  const effectiveAmt = getEffectiveAmount();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-wallet"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a' }}>Add Money to Smart Wallet</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Current Balance: <strong style={{ color: '#0284c7' }}>₹{Number(walletBalance).toFixed(2)}</strong></span>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* STATUS ALERT */}
        {statusMsg.text && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: statusMsg.type === 'success' ? '#dcfce7' : statusMsg.type === 'error' ? '#fef2f2' : '#e0f2fe',
              border: `1px solid ${statusMsg.type === 'success' ? '#86efac' : statusMsg.type === 'error' ? '#fca5a5' : '#bae6fd'}`,
              color: statusMsg.type === 'success' ? '#166534' : statusMsg.type === 'error' ? '#991b1b' : '#0369a1',
            }}
          >
            {loading && <i className="fa-solid fa-spinner fa-spin"></i>}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* PRESET AMOUNT BUTTONS */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
            Select Top-up Amount
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[500, 1000, 2000, 5000].map((amt) => {
              const isSelected = !isCustom && selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountSelect(amt)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                    background: isSelected ? '#f0f9ff' : '#ffffff',
                    color: isSelected ? '#0284c7' : '#334155',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              );
            })}
          </div>

          {/* CUSTOM AMOUNT INPUT */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              Or Enter Custom Amount (₹):
            </label>
            <input
              type="number"
              min={10}
              max={1000000}
              placeholder="e.g. 1500"
              value={customAmount}
              onChange={handleCustomChange}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: `1px solid ${isCustom && customAmount ? '#0284c7' : '#cbd5e1'}`,
                fontSize: '14px',
                fontWeight: 700,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* SECURITY INFO BANNER */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#16a34a', marginRight: '6px' }}></i>
          100% Secure Razorpay Payment. Funds will be verified server-side before being credited to your Smart Wallet balance.
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="dash-btn dash-btn-outline" disabled={loading} style={{ padding: '10px 18px', fontSize: '13px' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceedPayment}
            disabled={loading || !effectiveAmt || effectiveAmt < 10}
            className="dash-btn dash-btn-primary"
            style={{ padding: '10px 22px', fontSize: '13.5px', background: '#0284c7', borderColor: '#0284c7', opacity: (!effectiveAmt || effectiveAmt < 10) ? 0.6 : 1 }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Processing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-credit-card"></i> Pay ₹{effectiveAmt ? effectiveAmt.toLocaleString('en-IN') : 0} & Topup Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
