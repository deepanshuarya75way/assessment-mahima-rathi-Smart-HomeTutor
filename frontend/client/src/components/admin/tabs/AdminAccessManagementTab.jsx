import React, { useState, useEffect } from 'react';

const ADMIN_SECTIONS = [
  { key: 'overview.view', tabKey: 'overview', label: 'Overview & Metrics', icon: 'fa-gauge' },
  { key: 'demo-requests.manage', tabKey: 'demo-requests', label: 'Demo Class Requests', icon: 'fa-calendar-check' },
  { key: 'notifications.manage', tabKey: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  { key: 'users.manage', tabKey: 'users', label: 'User Directory', icon: 'fa-users-gear' },
  { key: 'tutor-verifications.manage', tabKey: 'tutor-verifications', label: 'Tutor Verifications', icon: 'fa-shield-check' },
  { key: 'certificates.manage', tabKey: 'certificates', label: 'Certificate Approvals', icon: 'fa-award' },
  { key: 'finance.view', tabKey: 'finance', label: 'Finance & Revenue', icon: 'fa-sack-dollar' },
  { key: 'payment-history.view', tabKey: 'payment-history', label: 'Payment History', icon: 'fa-clock-rotate-left' },
  { key: 'catalog.manage', tabKey: 'catalog', label: 'Catalog & Boards', icon: 'fa-layer-group' },
  { key: 'disputes.manage', tabKey: 'disputes', label: 'Disputes & Complaints', icon: 'fa-scale-balanced' },
  { key: 'newsletter.manage', tabKey: 'newsletter', label: 'Newsletter Subscribers', icon: 'fa-envelope-open-text' },
  { key: 'blogs.view', tabKey: 'blogs', label: 'Blog Articles', icon: 'fa-newspaper' },
];

export const AdminAccessManagementTab = () => {
  const [adminStaffList, setAdminStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullAccess, setFullAccess] = useState(false);
  const [manageAccess, setManageAccess] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Toast / Alert state
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchAdminStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/access-management');
      const data = await res.json();
      if (data.success && Array.isArray(data.adminStaff)) {
        setAdminStaffList(data.adminStaff);
      } else {
        showFeedback('error', data.message || 'Failed to fetch admin access list.');
      }
    } catch (err) {
      console.error('Fetch admin staff error:', err);
      showFeedback('error', 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStaff();
  }, []);

  const handleFullAccessToggle = (e) => {
    const isChecked = e.target.checked;
    setFullAccess(isChecked);
    if (isChecked) {
      // Select all section permissions immediately
      const allPermKeys = ADMIN_SECTIONS.map((s) => s.key);
      ['blogs.view', 'blogs.create', 'blogs.edit', 'blogs.delete'].forEach((bp) => {
        if (!allPermKeys.includes(bp)) allPermKeys.push(bp);
      });
      setSelectedPermissions(allPermKeys);
    } else {
      // Unselect all section permissions immediately
      setSelectedPermissions([]);
    }
  };

  const handlePermissionToggle = (key) => {
    setSelectedPermissions((prev) => {
      let next = [...prev];
      if (key === 'blogs.view' || key === 'blogs') {
        const blogPerms = ['blogs.view', 'blogs.create', 'blogs.edit', 'blogs.delete'];
        const hasBlog = next.includes('blogs.view') || next.includes('blogs');
        if (hasBlog) {
          next = next.filter((p) => !blogPerms.includes(p) && p !== 'blogs');
        } else {
          blogPerms.forEach((bp) => {
            if (!next.includes(bp)) next.push(bp);
          });
        }
      } else {
        if (next.includes(key)) {
          next = next.filter((p) => p !== key);
        } else {
          next.push(key);
        }
      }

      // If all sections are selected, check Full Access
      const allSectionKeys = ADMIN_SECTIONS.map((s) => s.key);
      const allSelected = allSectionKeys.every((sk) => {
        if (sk === 'blogs.view') return next.includes('blogs.view');
        return next.includes(sk);
      });
      setFullAccess(allSelected);

      return next;
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFullAccess(false);
    setManageAccess(false);
    setSelectedPermissions([]);
  };

  const handleEditClick = (staff) => {
    setEditingId(staff._id || staff.id);
    setEmail(staff.email || '');
    setPassword('');
    setShowPassword(false);
    setFullAccess(Boolean(staff.fullAccess || staff.isSuperAdmin));
    setManageAccess(Boolean(staff.manageAccess || staff.isSuperAdmin));

    let userPerms = Array.isArray(staff.permissions) ? [...staff.permissions] : [];
    if (staff.fullAccess || staff.isSuperAdmin) {
      userPerms = ADMIN_SECTIONS.map((s) => s.key);
      ['blogs.view', 'blogs.create', 'blogs.edit', 'blogs.delete'].forEach((bp) => {
        if (!userPerms.includes(bp)) userPerms.push(bp);
      });
    }
    setSelectedPermissions(userPerms);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showFeedback('error', 'Gmail / Email address is required.');
      return;
    }

    if (!editingId && !password) {
      showFeedback('error', 'Password is required when creating a new Admin Staff account.');
      return;
    }

    if (!fullAccess && !manageAccess && selectedPermissions.length === 0) {
      showFeedback('error', 'Please select at least one Admin Dashboard section or Full Access.');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingId ? `/api/admin/access-management/${editingId}` : '/api/admin/access-management';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        email: email.trim(),
        password: password || undefined,
        fullAccess,
        manageAccess,
        permissions: selectedPermissions,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showFeedback('success', data.message || (editingId ? 'Permissions updated successfully.' : 'Admin access created successfully.'));
        resetForm();
        fetchAdminStaff();
      } else {
        showFeedback('error', data.message || 'Failed to save admin access permissions.');
      }
    } catch (err) {
      console.error('Save admin access error:', err);
      showFeedback('error', 'Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeClick = async (staff) => {
    if (staff.isSuperAdmin) {
      showFeedback('error', 'Cannot revoke Super Admin access.');
      return;
    }

    const confirmMsg = `Are you sure you want to revoke Admin Access for "${staff.email}"? They will no longer be able to access restricted Admin Dashboard sections.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/access-management/${staff._id || staff.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Admin access revoked successfully.');
        if (editingId === (staff._id || staff.id)) resetForm();
        fetchAdminStaff();
      } else {
        showFeedback('error', data.message || 'Failed to revoke admin access.');
      }
    } catch (err) {
      console.error('Revoke access error:', err);
      showFeedback('error', 'Server error revoking admin access.');
    }
  };

  const isBlogSelected = selectedPermissions.includes('blogs.view') || selectedPermissions.includes('blogs');

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto 16px auto',
            padding: '12px 20px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: feedback.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
            borderRadius: '10px',
            color: feedback.type === 'success' ? '#15803d' : '#991b1b',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <i className={`fa-solid ${feedback.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* CREATE / EDIT ACCESS FORM */}
      <div className="dash-card" style={{ marginBottom: '24px' }}>
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f2a4a' }}>
              <i className="fa-solid fa-user-shield" style={{ color: '#0284c7' }}></i>
              {editingId ? 'Edit Admin Staff Access & Permissions' : 'Manage Admin Access'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Create or modify dashboard section access for admin staff members using their Gmail / email address.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={resetForm}
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              <i className="fa-solid fa-xmark"></i> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* EMAIL / GMAIL INPUT */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f2a4a', marginBottom: '6px' }}>
                Gmail / Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="blogmanager@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(editingId)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: editingId ? '#f1f5f9' : '#ffffff',
                }}
              />
            </div>

            {/* PASSWORD INPUT WITH EYE TOGGLE */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f2a4a', marginBottom: '6px' }}>
                Password {editingId ? '(Leave blank to keep existing password)' : <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingId ? 'Enter new password if changing' : 'Enter password for login'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingId}
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '15px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* MASTER ACCESS CONTROL */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f2a4a' }}>
              Master Access Control:
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* FULL ACCESS CHECKBOX */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: fullAccess ? '#e0f2fe' : '#ffffff', padding: '10px 18px', borderRadius: '8px', border: fullAccess ? '2px solid #0284c7' : '1px solid #cbd5e1', transition: 'all 0.2s ease' }}>
                <input
                  type="checkbox"
                  checked={fullAccess}
                  onChange={handleFullAccessToggle}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284c7' }}
                />
                <strong style={{ fontSize: '14px', color: '#0f2a4a' }}>Full Access</strong>
              </label>
            </div>
          </div>

          {/* INDIVIDUAL DASHBOARD SECTION CHECKBOXES */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f2a4a' }}>
              Select Dashboard Section Access:
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {ADMIN_SECTIONS.map((sec) => {
                const isChecked = selectedPermissions.includes(sec.key) || (sec.key === 'blogs.view' && isBlogSelected);

                return (
                  <label
                    key={sec.key}
                    onClick={() => handlePermissionToggle(sec.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isChecked ? '#f0f9ff' : '#ffffff',
                      border: isChecked ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: isChecked ? '700' : '500', color: isChecked ? '#0f2a4a' : '#334155' }}>
                        {sec.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              className="dash-btn dash-btn-primary"
              disabled={submitting}
              style={{ padding: '10px 28px', fontSize: '14.5px', fontWeight: '700' }}
            >
              {submitting ? (
                <span>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving Access...
                </span>
              ) : (
                <span>
                  <i className={`fa-solid ${editingId ? 'fa-pen-to-square' : 'fa-user-plus'}`}></i> {editingId ? 'Update Access' : 'Give Access'}
                </span>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={resetForm}
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* EXISTING ADMIN ACCESS LIST */}
      <div className="dash-card">
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f2a4a' }}>
            <i className="fa-solid fa-users-gear" style={{ color: '#0284c7' }}></i>
            Existing Admin Access ({adminStaffList.length})
          </h3>
          <button
            type="button"
            className="dash-btn dash-btn-outline"
            onClick={fetchAdminStaff}
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            <i className="fa-solid fa-rotate"></i> Refresh List
          </button>
        </div>

        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '8px' }}></i>
              <p style={{ fontWeight: 600 }}>Loading existing admin staff accounts...</p>
            </div>
          ) : adminStaffList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fa-solid fa-user-shield fa-2x" style={{ color: '#cbd5e1', marginBottom: '8px' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>No admin staff accounts configured yet.</p>
            </div>
          ) : (
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#0f2a4a' }}>Email / Gmail</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#0f2a4a' }}>Role Label</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#0f2a4a' }}>Access Sections</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#0f2a4a' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#0f2a4a', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminStaffList.map((staff) => {
                  const isSuper = staff.isSuperAdmin;
                  const isFull = staff.fullAccess || isSuper;

                  let accessBadges = [];
                  if (isSuper) {
                    accessBadges = ['Super Admin (Complete System Access)'];
                  } else if (isFull) {
                    accessBadges = ['Full Access (All Sections)'];
                    if (staff.manageAccess) accessBadges.push('Manage Access');
                  } else {
                    const secNames = ADMIN_SECTIONS.filter((s) => {
                      if (s.key === 'blogs.view') {
                        return staff.permissions.includes('blogs.view') || staff.permissions.includes('blogs');
                      }
                      return staff.permissions.includes(s.key);
                    }).map((s) => s.label.split(' (')[0]);

                    if (staff.manageAccess) secNames.push('Manage Access');
                    accessBadges = secNames.length > 0 ? secNames : ['No Sections Selected'];
                  }

                  return (
                    <tr key={staff._id || staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: '#0f2a4a' }}>
                        {staff.email}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        <span
                          style={{
                            background: isSuper ? '#fef3c7' : isFull ? '#e0f2fe' : '#f1f5f9',
                            color: isSuper ? '#b45309' : isFull ? '#0369a1' : '#334155',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '12px',
                          }}
                        >
                          {staff.adminRoleName || (isSuper ? 'Super Admin' : 'Admin Staff')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {accessBadges.map((b, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                              }}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        <span
                          style={{
                            color: staff.accountStatus === 'Active' ? '#16a34a' : '#dc2626',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <i className="fa-solid fa-circle" style={{ fontSize: '8px' }}></i>
                          {staff.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {!isSuper ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="dash-btn dash-btn-outline"
                              onClick={() => handleEditClick(staff)}
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeClick(staff)}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fa-solid fa-user-xmark"></i> Remove Access
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', italic: 'true' }}>Super Admin Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
