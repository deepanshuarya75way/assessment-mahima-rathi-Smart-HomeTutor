import React, { useState } from 'react';

export const ParentInvoices = ({ invoices = [], onInvoicePaid }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [message, setMessage] = useState('');

  const handlePayInvoice = async (inv) => {
    setMessage('');
    setLoadingId(inv.id || inv.invoiceId);
    try {
      const res = await fetch('/api/parent/pay-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: inv.amount,
          description: `Tuition Fee Payment for ${inv.subject} (${inv.studentName})`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`${data.message || 'Payment completed successfully!'}`);
        if (onInvoicePaid) onInvoicePaid();
      } else {
        setMessage(`${data.message || 'Payment failed. Please try again.'}`);
      }
    } catch (err) {
      console.error('Pay invoice error:', err);
      setMessage('Network error processing payment.');
    } finally {
      setLoadingId(null);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>
          <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#b45309' }}></i> Tuition Invoices & Billing
        </h3>
      </div>

      {message && (
        <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <i className="fa-solid fa-file-circle-check" style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '10px' }}></i>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>No Invoices Outstanding</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            All tuition fees and class invoices for your children are currently up to date.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#0f2a4a', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}>Invoice ID</th>
                <th style={{ padding: '12px 14px' }}>Child</th>
                <th style={{ padding: '12px 14px' }}>Tutor / Subject</th>
                <th style={{ padding: '12px 14px' }}>Amount</th>
                <th style={{ padding: '12px 14px' }}>Due Date</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px', fontWeight: 700, color: '#0f2a4a' }}>{inv.invoiceId}</td>
                  <td style={{ padding: '14px', color: '#334155' }}>{inv.studentName}</td>
                  <td style={{ padding: '14px', color: '#334155' }}>
                    <div><strong>{inv.subject}</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Educator: {inv.tutorName}</div>
                  </td>
                  <td style={{ padding: '14px', fontWeight: 800, color: '#0f2a4a' }}>₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '14px', color: '#64748b', fontSize: '13px' }}>{inv.dueDate}</td>
                  <td style={{ padding: '14px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: inv.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: inv.status === 'Paid' ? '#15803d' : '#b45309',
                        border: inv.status === 'Paid' ? '1px solid #86efac' : '1px solid #fcd34d',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    {inv.status === 'Pending' ? (
                      <button
                        type="button"
                        disabled={loadingId === (inv.id || inv.invoiceId)}
                        onClick={() => handlePayInvoice(inv)}
                        className="dash-btn dash-btn-primary"
                        style={{ background: '#059669', fontSize: '12px', padding: '6px 14px', display: 'inline-flex' }}
                      >
                        {loadingId === (inv.id || inv.invoiceId) ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                        ) : (
                          <><i className="fa-solid fa-credit-card"></i> Pay Invoice</>
                        )}
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                        <i className="fa-solid fa-circle-check"></i> Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
