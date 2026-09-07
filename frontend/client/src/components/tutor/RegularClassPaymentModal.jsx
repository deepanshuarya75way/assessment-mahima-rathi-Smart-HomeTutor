import React, { useState } from 'react';
import { loadRazorpaySdk } from '../../utils/razorpayLoader';
import { studentApi } from '../../services/studentApi';

export const RegularClassPaymentModal = ({ isOpen, onClose, tutor, onSuccess, walletBalance = 0, onOpenTopup }) => {
  const [step, setStep] = useState('payment'); // 'payment' | 'booking' | 'completed'
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'wallet'
  const [amount, setAmount] = useState(tutor?.fee || 500);
  const [paymentState, setPaymentState] = useState({ status: 'idle', message: '', paymentId: null });
  
  // Booking Form State
  const [message, setMessage] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  if (!isOpen || !tutor) return null;

  const tutorName = tutor.name || (tutor.user && tutor.user.name) || 'Tutor';
  const tutorId = tutor._id;
  const tutorFee = Number(tutor.fee || 500);

  // STEP 1A: Handle Smart Wallet Payment
  const handleWalletPayment = async () => {
    const payAmount = Number(amount) > 0 ? Number(amount) : tutorFee;

    if (walletBalance < payAmount) {
      setPaymentState({
        status: 'failed',
        message: `Insufficient Smart Wallet balance (₹${walletBalance.toFixed(2)}). Required: ₹${payAmount}. Please top up your wallet or pay via Razorpay.`,
      });
      return;
    }

    setPaymentState({ status: 'processing', message: 'Debiting Smart Wallet balance...' });

    try {
      const walletRes = await studentApi.payWithWallet({
        amount: payAmount,
        tutorId: tutorId,
      });

      if (walletRes && walletRes.success) {
        setPaymentState({
          status: 'success',
          message: 'Smart Wallet Payment Verified Successfully!',
          paymentId: walletRes.payment ? walletRes.payment.paymentId : `pay_wallet_${Date.now()}`,
        });
        setTimeout(() => setStep('booking'), 1200);
      } else {
        setPaymentState({ status: 'failed', message: walletRes?.message || 'Wallet payment failed.' });
      }
    } catch (err) {
      console.error('Wallet Payment Error:', err);
      setPaymentState({ status: 'failed', message: 'Error processing wallet payment.' });
    }
  };

  // STEP 1B: Handle Razorpay Payment for Regular Class
  const handlePayment = async () => {
    if (paymentMethod === 'wallet') {
      return handleWalletPayment();
    }

    setPaymentState({ status: 'processing', message: 'Initializing Razorpay Payment Checkout...' });

    try {
      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded) {
        setPaymentState({ status: 'failed', message: 'Failed to load Razorpay SDK. Please check internet connection.' });
        return;
      }

      // 1. Create Payment Order
      const payAmount = Number(amount) > 0 ? Number(amount) : tutorFee;
      const orderRes = await studentApi.createPaymentOrder({
        amount: payAmount,
        paymentType: 'Tuition Fee Payment',
        tutorId: tutorId,
      });

      if (!orderRes || !orderRes.success) {
        setPaymentState({ status: 'failed', message: orderRes?.message || 'Failed to create payment order.' });
        return;
      }

      // 2. Open Razorpay Checkout Window
      const options = {
        key: orderRes.key_id || 'rzp_test_HomeTutorKey',
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'Smart HomeTutor',
        description: `Regular Class Payment for ${tutorName}`,
        order_id: orderRes.orderId,
        handler: async (response) => {
          setPaymentState({ status: 'processing', message: 'Verifying payment with backend...' });
          try {
            const verifyRes = await studentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id || orderRes.orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'simulated_signature',
              paymentType: 'Tuition Fee Payment',
              amount: payAmount,
              tutorId: tutorId,
            });

            if (verifyRes.success) {
              setPaymentState({
                status: 'success',
                message: 'Payment Verified Successfully!',
                paymentId: response.razorpay_payment_id || orderRes.orderId,
              });
              // Transition to Booking Form Step
              setTimeout(() => setStep('booking'), 1200);
            } else {
              setPaymentState({ status: 'failed', message: verifyRes.message || 'Payment verification failed.' });
            }
          } catch (err) {
            console.error('Verify Payment Error:', err);
            setPaymentState({ status: 'failed', message: 'Error verifying payment with server.' });
          }
        },
        modal: {
          ondismiss: async () => {
            setPaymentState({ status: 'failed', message: 'Payment cancelled by user.' });
            try {
              await studentApi.recordPaymentCancel({ razorpay_order_id: orderRes.orderId, reason: 'Payment cancelled by user.' });
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
          const reason = resp.error ? resp.error.description : 'Payment Failed.';
          setPaymentState({ status: 'failed', message: reason });
        });
        rzp.open();
      } else {
        // Dev Simulation Fallback
        const verifyRes = await studentApi.verifyPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'simulated_signature',
          paymentType: 'Tuition Fee Payment',
          amount: payAmount,
          tutorId: tutorId,
        });

        if (verifyRes.success) {
          setPaymentState({
            status: 'success',
            message: 'Simulated Payment Verified Successfully!',
            paymentId: `pay_sim_${Date.now()}`,
          });
          setTimeout(() => setStep('booking'), 1200);
        } else {
          setPaymentState({ status: 'failed', message: verifyRes.message || 'Payment simulation failed.' });
        }
      }
    } catch (err) {
      console.error('Payment Flow Error:', err);
      setPaymentState({ status: 'failed', message: 'Server error during payment initialization.' });
    }
  };

  // STEP 2: Handle Regular Class Booking Request Submission (After Payment)
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    setBookingLoading(true);

    try {
      const response = await fetch('/api/student/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorProfileId: tutorId,
          message: message.trim() || 'Regular Class Subscription Booking',
          isTrial: false, // Regular Class (Not a trial demo)
          isPaid: true,
          paymentId: paymentState.paymentId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlertMsg({ type: 'success', text: 'Regular Class Booked Successfully! Tutor has been notified.' });
        setStep('completed');
        if (onSuccess) onSuccess('Regular Class Booked Successfully!');
        setTimeout(() => {
          onClose();
          setStep('payment');
          setPaymentState({ status: 'idle', message: '', paymentId: null });
        }, 2200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to book regular class.' });
      }
    } catch (err) {
      console.error('Regular class booking error:', err);
      setAlertMsg({ type: 'error', text: 'Network error submitting booking.' });
    } finally {
      setBookingLoading(false);
    }
  };

  const isWalletInsufficient = paymentMethod === 'wallet' && walletBalance < Number(amount || 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
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
          maxWidth: '540px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Step {step === 'payment' ? '1 of 2: Tuition Fee Payment' : '2 of 2: Regular Class Booking'}
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-graduation-cap" style={{ color: '#0284c7' }}></i> Book Regular Class with {tutorName}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* STEP 1: PAYMENT CHECKOUT VIEW */}
        {step === 'payment' && (
          <div>
            {/* PAYMENT METHOD SELECTOR */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Select Payment Method:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `2px solid ${paymentMethod === 'razorpay' ? '#0284c7' : '#e2e8f0'}`, background: paymentMethod === 'razorpay' ? '#f0f9ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                  <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
                  <span><i className="fa-solid fa-credit-card" style={{ color: '#0284c7' }}></i> Razorpay Online</span>
                </label>

                <label style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `2px solid ${paymentMethod === 'wallet' ? '#0284c7' : '#e2e8f0'}`, background: paymentMethod === 'wallet' ? '#f0f9ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                  <input type="radio" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
                  <span><i className="fa-solid fa-wallet" style={{ color: '#0284c7' }}></i> Smart Wallet (₹{walletBalance.toFixed(2)})</span>
                </label>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: '600' }}>Tutor Hourly Rate:</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>₹{tutorFee}/hr</span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Select Payable Tuition Amount (₹):
                </label>
                <input
                  type="number"
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '700',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {paymentMethod === 'wallet' ? (
                <div style={{ fontSize: '12.5px', color: isWalletInsufficient ? '#b91c1c' : '#15803d', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Available Smart Wallet Balance: <strong>₹{walletBalance.toFixed(2)}</strong></span>
                  {isWalletInsufficient && onOpenTopup && (
                    <button type="button" onClick={onOpenTopup} className="dash-btn dash-btn-outline" style={{ fontSize: '11.5px', padding: '3px 8px' }}>
                      + Top Up Wallet
                    </button>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: '#16a34a', marginRight: '6px' }}></i>
                  Payment is mandatory to unlock Regular Class booking. Your payment will be securely processed via Razorpay.
                </p>
              )}
            </div>

            {paymentState.message && (
              <div
                style={{
                  background: paymentState.status === 'success' ? '#dcfce7' : paymentState.status === 'failed' ? '#fef2f2' : '#e0f2fe',
                  border: `1px solid ${paymentState.status === 'success' ? '#86efac' : paymentState.status === 'failed' ? '#fca5a5' : '#bae6fd'}`,
                  color: paymentState.status === 'success' ? '#166534' : paymentState.status === 'failed' ? '#991b1b' : '#0369a1',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {paymentState.status === 'processing' && <i className="fa-solid fa-spinner fa-spin"></i>}
                {paymentState.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={onClose} className="dash-btn dash-btn-outline" style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentState.status === 'processing'}
                className="dash-btn dash-btn-primary"
                style={{ padding: '10px 24px', fontSize: '13.5px', background: '#0284c7', borderColor: '#0284c7' }}
              >
                {paymentState.status === 'processing' ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                  </>
                ) : paymentMethod === 'wallet' ? (
                  <>
                    <i className="fa-solid fa-wallet"></i> Pay ₹{amount} from Smart Wallet
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-credit-card"></i> Pay ₹{amount} & Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BOOKING FORM VIEW (AFTER PAYMENT IS VERIFIED) */}
        {(step === 'booking' || step === 'completed') && (
          <div>
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', color: '#15803d', fontSize: '13px', fontWeight: '700' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Payment Verified! Complete your regular class details below.
            </div>

            {alertMsg.text && (
              <div
                style={{
                  background: alertMsg.type === 'success' ? '#dcfce7' : '#fef2f2',
                  border: `1px solid ${alertMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
                  color: alertMsg.type === 'success' ? '#166534' : '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                <i className={`fa-solid ${alertMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {alertMsg.text}
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f2a4a', marginBottom: '6px' }}>
                  Regular Class Requirements / Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Specify subjects to cover, class schedule (e.g. Mon-Wed-Fri 5 PM), learning targets..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={onClose} className="dash-btn dash-btn-outline" style={{ padding: '8px 18px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || step === 'completed'}
                  className="dash-btn dash-btn-primary"
                  style={{ padding: '10px 24px', fontSize: '13.5px', background: '#16a34a', borderColor: '#16a34a' }}
                >
                  {bookingLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Booking Regular Class...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-calendar-check"></i> Confirm Regular Class Booking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
