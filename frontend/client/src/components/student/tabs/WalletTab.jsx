import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';
import { loadRazorpaySdk } from '../../../utils/razorpayLoader';
import { ReferralSection } from '../../common/ReferralSection';

export const WalletTab = ({ walletBalance = 0, transactions = [], onWalletTopupSuccess, onOpenTopup }) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [tuitionPayMethod, setTuitionPayMethod] = useState('wallet'); // 'wallet' | 'razorpay'

  // Tuition Fee Payment State
  const [tutors, setTutors] = useState([]);
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [feeSummary, setFeeSummary] = useState({
    totalTuitionFee: 0,
    totalPaidAmount: 0,
    paymentLeft: 0,
    paymentStatus: 'Loading...',
  });

  const [tuitionAmount, setTuitionAmount] = useState('');
  const [payState, setPayState] = useState({ status: 'idle', message: '' }); // idle | processing | success | failed

  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Referral State
  const [referralData, setReferralData] = useState({
    referralCode: '',
    referralEarnings: 0,
    totalReferrals: 0,
    studentReferrals: 0,
    tutorReferrals: 0,
    referrals: [],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTutorId) {
      loadTutorFeeSummary(selectedTutorId);
    }
  }, [selectedTutorId]);

  const fetchInitialData = async () => {
    setLoadingHistory(true);
    try {
      const [tutorsRes, historyRes, refRes] = await Promise.all([
        studentApi.getMyTutors(),
        studentApi.getPaymentHistory(),
        studentApi.getReferrals(),
      ]);

      if (tutorsRes.success && Array.isArray(tutorsRes.tutors)) {
        setTutors(tutorsRes.tutors);
        if (tutorsRes.tutors.length > 0) {
          const firstTutor = tutorsRes.tutors[0];
          setSelectedTutorId(firstTutor._id);
          applyFeeSummary(firstTutor);
        }
      }

      if (historyRes.success && Array.isArray(historyRes.payments)) {
        setPaymentHistory(historyRes.payments);
      }

      if (refRes && refRes.success) {
        setReferralData({
          referralCode: refRes.referralCode || '',
          referralEarnings: refRes.totalEarnings || refRes.referralEarnings || 0,
          totalReferrals: refRes.totalReferrals || 0,
          studentReferrals: refRes.studentReferrals || 0,
          tutorReferrals: refRes.tutorReferrals || 0,
          referrals: refRes.referrals || refRes.referredUsers || [],
        });
      }
    } catch (err) {
      console.error('Fetch Payment Data Error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const applyFeeSummary = (summaryObj) => {
    if (!summaryObj) return;
    const total = Number(summaryObj.totalTuitionFee) || 0;
    const paid = Number(summaryObj.totalPaidAmount) || 0;
    const left = Number(summaryObj.paymentLeft) || 0;
    const status = summaryObj.paymentStatus || 'Unpaid';

    setFeeSummary({
      totalTuitionFee: total,
      totalPaidAmount: paid,
      paymentLeft: left,
      paymentStatus: status,
    });

    setTuitionAmount(left > 0 ? String(left) : '');
  };

  const loadTutorFeeSummary = async (tutorId) => {
    if (!tutorId) return;
    try {
      const res = await studentApi.getTutorFeeSummary(tutorId);
      if (res.success && res.summary) {
        applyFeeSummary(res.summary);
      }
    } catch (err) {
      console.error('Load Tutor Fee Summary Error:', err);
    }
  };

  const refreshAllPaymentData = async (tId) => {
    try {
      const [hRes, fRes] = await Promise.all([
        studentApi.getPaymentHistory(),
        studentApi.getTutorFeeSummary(tId || selectedTutorId),
      ]);

      if (hRes.success && Array.isArray(hRes.payments)) {
        setPaymentHistory(hRes.payments);
      }

      if (fRes.success && fRes.summary) {
        applyFeeSummary(fRes.summary);
      }
    } catch (err) {
      console.error('Refresh Payment Data Error:', err);
    }
  };

  const handleTopup = async (amount) => {
    try {
      const res = await studentApi.topupWallet(amount);
      if (res.success) {
        if (onWalletTopupSuccess) onWalletTopupSuccess(res.walletBalance, res.message);
      } else {
        alert(res.message || 'Top-up failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during wallet top-up.');
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    if (promoCode.trim().toUpperCase() === 'WELCOME10') {
      setPromoMsg('Promo WELCOME10 is valid for 10% discount on regular class bookings!');
      setPromoCode('');
    } else {
      setPromoMsg('Invalid or expired promo code.');
    }
  };

  // Tuition Fee Payment Handler (Smart Wallet OR Razorpay)
  const handlePayTuitionFee = async (e) => {
    e.preventDefault();
    const payAmt = Number(tuitionAmount);

    if (!selectedTutorId) {
      setPayState({ status: 'failed', message: 'Please select an assigned tutor.' });
      return;
    }

    if (!payAmt || payAmt <= 0) {
      setPayState({ status: 'failed', message: 'Please enter a valid tuition fee amount.' });
      return;
    }

    if (feeSummary.totalTuitionFee > 0 && payAmt > feeSummary.paymentLeft) {
      setPayState({
        status: 'failed',
        message: `Entered amount (₹${payAmt}) exceeds the remaining payable fee balance of ₹${feeSummary.paymentLeft}.`,
      });
      return;
    }

    // PATH 1: PAY WITH SMART WALLET
    if (tuitionPayMethod === 'wallet') {
      if (walletBalance < payAmt) {
        setPayState({
          status: 'failed',
          message: `Insufficient Smart Wallet balance (₹${walletBalance.toFixed(2)}). Required: ₹${payAmt}. Shortfall: ₹${(payAmt - walletBalance).toFixed(2)}.`,
        });
        return;
      }

      setPayState({ status: 'processing', message: 'Debiting Smart Wallet balance...' });

      try {
        const walletRes = await studentApi.payWithWallet({
          amount: payAmt,
          tutorId: selectedTutorId,
        });

        if (walletRes && walletRes.success) {
          setPayState({ status: 'success', message: `₹${payAmt} Tuition Fee Paid Successfully from Smart Wallet!` });
          if (onWalletTopupSuccess) {
            onWalletTopupSuccess(walletRes.walletBalance, walletRes.message);
          }
          await refreshAllPaymentData(selectedTutorId);
        } else {
          setPayState({ status: 'failed', message: walletRes?.message || 'Wallet payment failed.' });
        }
      } catch (err) {
        console.error('Wallet tuition payment error:', err);
        setPayState({ status: 'failed', message: 'Error processing wallet payment.' });
      }
      return;
    }

    // PATH 2: PAY WITH RAZORPAY ONLINE
    setPayState({ status: 'processing', message: 'Initializing Razorpay Checkout...' });

    try {
      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded) {
        setPayState({ status: 'failed', message: 'Failed to load Razorpay Checkout SDK. Please check internet connection.' });
        return;
      }

      const orderRes = await studentApi.createPaymentOrder({
        amount: payAmt,
        paymentType: 'Tuition Fee Payment',
        tutorId: selectedTutorId,
      });

      if (!orderRes.success) {
        setPayState({ status: 'failed', message: orderRes.message || 'Failed to create payment order.' });
        return;
      }

      const options = {
        key: orderRes.key_id || 'rzp_test_HomeTutorKey',
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'HomeTutor Platform',
        description: 'Student Tuition Fee Payment',
        order_id: orderRes.orderId,
        handler: async (response) => {
          setPayState({ status: 'processing', message: 'Verifying payment signature with backend...' });
          try {
            const verifyRes = await studentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id || orderRes.orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'simulated_signature',
              paymentType: 'Tuition Fee Payment',
              amount: payAmt,
              tutorId: selectedTutorId,
            });

            if (verifyRes.success) {
              setPayState({ status: 'success', message: 'Payment Verified & Tuition Fee Paid Successfully!' });
              if (verifyRes.walletBalance !== undefined && onWalletTopupSuccess) {
                onWalletTopupSuccess(verifyRes.walletBalance, 'Payment verified!');
              }
              await refreshAllPaymentData(selectedTutorId);
            } else {
              setPayState({ status: 'failed', message: verifyRes.message || 'Payment signature verification failed.' });
            }
          } catch (err) {
            console.error('Verify Payment Handler Error:', err);
            setPayState({ status: 'failed', message: 'Payment verification failed. Please contact support.' });
          }
        },
        modal: {
          ondismiss: async () => {
            setPayState({ status: 'failed', message: 'Payment cancelled by user.' });
            try {
              await studentApi.recordPaymentCancel({ razorpay_order_id: orderRes.orderId, reason: 'Payment cancelled by user.' });
              await refreshAllPaymentData(selectedTutorId);
            } catch (err) {
              console.error('Cancel recording error:', err);
            }
          },
        },
        prefill: {
          name: 'Student Account',
        },
        theme: {
          color: '#0284c7',
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async (resp) => {
          const reason = resp.error ? resp.error.description : 'Payment Failed.';
          setPayState({ status: 'failed', message: reason });
          try {
            await studentApi.recordPaymentFail({ razorpay_order_id: orderRes.orderId, reason });
            await refreshAllPaymentData(selectedTutorId);
          } catch (err) {
            console.error('Fail recording error:', err);
          }
        });
        rzp.open();
      } else {
        const verifyRes = await studentApi.verifyPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'simulated_signature',
          paymentType: 'Tuition Fee Payment',
          amount: payAmt,
          tutorId: selectedTutorId,
        });

        if (verifyRes.success) {
          setPayState({ status: 'success', message: 'Payment Verified & Tuition Fee Paid Successfully!' });
          if (verifyRes.walletBalance !== undefined && onWalletTopupSuccess) {
            onWalletTopupSuccess(verifyRes.walletBalance, 'Payment verified!');
          }
          await refreshAllPaymentData(selectedTutorId);
        } else {
          setPayState({ status: 'failed', message: verifyRes.message || 'Payment verification failed.' });
        }
      }
    } catch (err) {
      console.error('Pay Tuition Fee Error:', err);
      setPayState({ status: 'failed', message: 'Server error initializing payment.' });
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* PAY TUITION FEE TO PLATFORM VIA RAZORPAY CARD */}
      <div className="dash-card" style={{ marginBottom: '24px', borderLeft: '4px solid #0284c7' }}>
        <div className="dash-card-header">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-credit-card" style={{ color: '#0284c7' }}></i> Pay Tuition Fee to Platform (Razorpay)
          </h3>
          <span style={{ fontSize: '11.5px', background: '#e0f2fe', color: '#0284c7', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
            Official Platform Escrow
          </span>
        </div>

        {payState.message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13.5px',
              fontWeight: '600',
              background: payState.status === 'success' ? '#f0fdf4' : payState.status === 'processing' ? '#e0f2fe' : '#fef2f2',
              color: payState.status === 'success' ? '#166534' : payState.status === 'processing' ? '#0369a1' : '#991b1b',
              border: `1px solid ${payState.status === 'success' ? '#86efac' : payState.status === 'processing' ? '#bae6fd' : '#fca5a5'}`,
            }}
          >
            {payState.message}
          </div>
        )}

        {/* DYNAMIC FEE BREAKDOWN SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Tuition Fee</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f2a4a', marginTop: '2px' }}>
              {feeSummary.totalTuitionFee > 0 ? `₹${feeSummary.totalTuitionFee.toLocaleString('en-IN')}` : 'No Fee Configured'}
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Paid Amount</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
              ₹{feeSummary.totalPaidAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div
            style={{
              background: feeSummary.paymentLeft === 0 && feeSummary.totalTuitionFee > 0 ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${feeSummary.paymentLeft === 0 && feeSummary.totalTuitionFee > 0 ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: feeSummary.paymentLeft === 0 && feeSummary.totalTuitionFee > 0 ? '#166534' : '#b45309',
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Payment Left
            </span>
            <div
              style={{
                fontSize: '18px',
                fontWeight: '800',
                color: feeSummary.paymentLeft === 0 && feeSummary.totalTuitionFee > 0 ? '#15803d' : '#d97706',
                marginTop: '2px',
              }}
            >
              ₹{feeSummary.paymentLeft.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Payment Status</span>
            <div style={{ marginTop: '4px' }}>
              <span
                className={`status-pill ${
                  feeSummary.paymentStatus === 'Paid'
                    ? 'status-confirmed'
                    : feeSummary.paymentStatus === 'Partial Payment'
                    ? 'status-pending'
                    : feeSummary.paymentStatus === 'No Fee Configured'
                    ? 'status-cancelled'
                    : 'status-pending'
                }`}
              >
                {feeSummary.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePayTuitionFee}>
          {/* PAYMENT METHOD SELECTOR */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Select Payment Method:
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${tuitionPayMethod === 'wallet' ? '#0284c7' : '#cbd5e1'}`, background: tuitionPayMethod === 'wallet' ? '#f0f9ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                <input type="radio" checked={tuitionPayMethod === 'wallet'} onChange={() => setTuitionPayMethod('wallet')} />
                <span><i className="fa-solid fa-wallet" style={{ color: '#0284c7' }}></i> Smart Wallet (₹{walletBalance.toFixed(2)})</span>
              </label>
              <label style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${tuitionPayMethod === 'razorpay' ? '#0284c7' : '#cbd5e1'}`, background: tuitionPayMethod === 'razorpay' ? '#f0f9ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                <input type="radio" checked={tuitionPayMethod === 'razorpay'} onChange={() => setTuitionPayMethod('razorpay')} />
                <span><i className="fa-solid fa-credit-card" style={{ color: '#0284c7' }}></i> Razorpay (UPI / Card / Net Banking)</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Select Assigned Tutor *
              </label>
              <select
                value={selectedTutorId}
                onChange={(e) => setSelectedTutorId(e.target.value)}
                className="tr-select"
              >
                {tutors.length === 0 ? (
                  <option value="">No assigned tutor found</option>
                ) : (
                  tutors.map((t) => {
                    const subjectDisplay = t.subject ? ` — ${t.subject}` : '';
                    return (
                      <option key={t._id} value={t._id}>
                        {t.name}{subjectDisplay}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Tuition Fee Amount (₹) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={tuitionAmount}
                onChange={(e) => setTuitionAmount(e.target.value.replace(/\D/g, ''))}
                className="tr-input"
                placeholder={feeSummary.paymentLeft > 0 ? `Max ₹${feeSummary.paymentLeft}` : 'Fee amount'}
                disabled={feeSummary.paymentLeft === 0 || payState.status === 'processing'}
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="dash-btn dash-btn-accent"
                disabled={payState.status === 'processing' || feeSummary.paymentLeft === 0 || feeSummary.totalTuitionFee === 0}
                style={{ width: '100%', justifyContent: 'center', height: '42px', background: tuitionPayMethod === 'wallet' ? '#0284c7' : undefined, borderColor: tuitionPayMethod === 'wallet' ? '#0284c7' : undefined }}
              >
                {payState.status === 'processing' ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Processing Payment...
                  </>
                ) : feeSummary.paymentLeft === 0 && feeSummary.totalTuitionFee > 0 ? (
                  <>
                    <i className="fa-solid fa-circle-check"></i> Tuition Fee Paid
                  </>
                ) : tuitionPayMethod === 'wallet' ? (
                  <>
                    <i className="fa-solid fa-wallet"></i> Pay ₹{tuitionAmount || 0} from Wallet
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-credit-card"></i> Pay via Razorpay
                  </>
                )}
              </button>
            </div>
          </div>

          {/* INSUFFICIENT WALLET BALANCE SHORTFALL ALERT */}
          {tuitionPayMethod === 'wallet' && Number(tuitionAmount || 0) > 0 && walletBalance < Number(tuitionAmount || 0) && (
            <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#991b1b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i> Insufficient Smart Wallet Balance
                </strong>
                <span style={{ fontSize: '12px', marginTop: '2px', display: 'block' }}>
                  Available: <strong>₹{walletBalance.toFixed(2)}</strong> &bull; Required: <strong>₹{Number(tuitionAmount).toLocaleString('en-IN')}</strong> &bull; Shortfall: <strong style={{ color: '#dc2626' }}>₹{(Number(tuitionAmount) - walletBalance).toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {onOpenTopup && (
                  <button type="button" onClick={onOpenTopup} className="dash-btn dash-btn-outline" style={{ fontSize: '12px', padding: '4px 10px', background: '#ffffff', color: '#0284c7', borderColor: '#0284c7' }}>
                    + Top Up Wallet
                  </button>
                )}
                <button type="button" onClick={() => setTuitionPayMethod('razorpay')} className="dash-btn dash-btn-primary" style={{ fontSize: '12px', padding: '4px 10px', background: '#dc2626', borderColor: '#dc2626' }}>
                  Pay via Razorpay
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
        {/* WALLET BALANCE CARD */}
        <div className="wallet-card-bg" style={{ alignSelf: 'start', height: 'fit-content' }}>
          <div className="wallet-balance-title">Smart Wallet Balance</div>
          <div className="wallet-balance-amount">₹{walletBalance ? walletBalance.toFixed(2) : '0.00'}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="dash-btn dash-btn-primary" style={{ background: '#ffffff', color: '#0284c7', fontWeight: 800 }} onClick={onOpenTopup}>
              + Add Credits to Wallet
            </button>
          </div>

          {promoMsg && (
            <div style={{ marginTop: '10px', fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '6px', color: '#ffffff' }}>
              {promoMsg}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Promo Discount Code</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Try WELCOME10"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: 'none', fontSize: '12px', flex: 1 }}
              />
              <button className="dash-btn dash-btn-accent" style={{ padding: '6px 12px' }} onClick={handleApplyPromo}>
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* INVOICES & PAYMENT HISTORY TABLE */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3><i className="fa-solid fa-file-invoice-dollar"></i> Verified Payment History & Invoices</h3>
          </div>

          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Order / Ref ID</th>
                  <th>Payment Type</th>
                  <th>Tutor / Details</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      <i className="fa-solid fa-spinner fa-spin"></i> Loading payment history...
                    </td>
                  </tr>
                ) : paymentHistory.length > 0 ? (
                  paymentHistory.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#0f172a' }}>
                          #{p.orderId ? p.orderId.substring(0, 10) : p._id.substring(0, 8)}
                        </div>
                        <small style={{ color: '#64748b' }}>{p.paymentId || 'N/A'}</small>
                      </td>
                      <td style={{ fontWeight: '600', color: '#334155' }}>{p.paymentType || 'Tuition Fee Payment'}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f2a4a', fontSize: '13px' }}>
                          {p.tutor ? p.tutor.name || 'Assigned Tutor' : 'HomeTutor Platform'}
                        </div>
                        <small style={{ color: '#64748b' }}>{p.tutor ? p.tutor.email : ''}</small>
                      </td>
                      <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                        {new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: '800', color: '#0f2a4a' }}>₹{p.amount}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            p.paymentStatus === 'Success' || p.paymentStatus === 'Paid'
                              ? 'status-confirmed'
                              : p.paymentStatus === 'Pending'
                              ? 'status-pending'
                              : 'status-cancelled'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td>#{tx._id.substring(0, 8)}</td>
                      <td>{tx.type || 'Transaction'}</td>
                      <td>{tx.description || 'Platform Wallet'}</td>
                      <td>{new Date(tx.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 700, color: '#0f2a4a' }}>₹{tx.amount}</td>
                      <td>
                        <span className="status-pill status-confirmed">
                          {tx.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      No verified tuition fee payments or transaction history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REFERRAL HISTORY & PROGRAM SECTION */}
      <div style={{ marginTop: '24px' }}>
        <ReferralSection
          referralCode={referralData.referralCode}
          referralEarnings={referralData.referralEarnings}
          referredCount={referralData.totalReferrals}
          referredUsers={referralData.referrals}
          userRole="student"
        />
      </div>
    </div>
  );
};
