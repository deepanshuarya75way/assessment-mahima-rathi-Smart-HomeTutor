import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';

export const AdminUsersTab = ({ onRoleChange, onDeleteUser, onFilterChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    fetchUsers();
    if (onFilterChange) {
      onFilterChange({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        sort: sortBy,
      });
    }
  }, [searchQuery, roleFilter, statusFilter, sortBy]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAllUsers({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        sort: sortBy,
      });

      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      } else {
        setError(res.message || 'Unable to load users. Please try again.');
      }
    } catch (err) {
      console.error('Fetch Users Error:', err);
      setError('Unable to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortBy('latest');
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const res = await adminApi.updateUserRole(userId, newRole);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
        if (onRoleChange) onRoleChange(userId, newRole);
      } else {
        alert(res.message || 'Failed to update user role.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update user role.');
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Are you sure you want to delete this user account from MongoDB?', 'Delete User', 'Delete', 'Cancel')
      : window.confirm('Are you sure you want to delete this user account from MongoDB?');
    if (!confirmed) return;
    try {
      const res = await adminApi.deleteUser(userId);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        if (onDeleteUser) onDeleteUser(userId);
      } else {
        alert(res.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const handleToggleChatUnlock = async (userId) => {
    try {
      const res = await adminApi.toggleUserChatUnlock(userId);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, chatUnlockedByAdmin: res.chatUnlockedByAdmin } : u))
        );
        alert(res.message);
      } else {
        alert(res.message || 'Failed to update chat unlock status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating chat unlock status.');
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        {/* CARD HEADER & CONTROLS */}
        <div className="dash-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '14px', items: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0 }}><i className="fa-solid fa-user-gear"></i> Multi-Role User Accounts Directory</h3>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', width: '320px', maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <button type="submit" className="dash-btn dash-btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
          </div>

          {/* FILTERS & SORT BAR */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginRight: '6px' }}>Filter Role:</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', fontWeight: '600' }}
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="tutor">Tutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginRight: '6px' }}>Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', fontWeight: '600' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginRight: '6px' }}>Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', fontWeight: '600' }}
                  >
                    <option value="latest">Latest (Newest First)</option>
                    <option value="oldest">Oldest (First Registered)</option>
                    <option value="name_asc">Name (A - Z)</option>
                    <option value="name_desc">Name (Z - A)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={handleClearFilters}
                style={{ padding: '6px 14px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: '700' }}
              >
                <i className="fa-solid fa-rotate-left"></i> Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* USER TABLE */}
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>JOINED DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const statusClass =
                    user.status === 'Active' || user.status === 'Approved'
                      ? 'status-confirmed'
                      : user.status === 'Pending'
                      ? 'status-pending'
                      : 'status-cancelled';

                  return (
                    <tr key={user._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{user.name || 'User Account'}</div>
                        <small style={{ color: '#64748b' }}>{user.email}</small>
                      </td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          <option value="student">Student</option>
                          <option value="tutor">Tutor</option>
                          <option value="parent">Parent</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '13px', color: '#64748b' }}>
                        {new Date(user.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="dash-btn"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: user.chatUnlockedByAdmin ? '#dcfce7' : '#fef3c7',
                              color: user.chatUnlockedByAdmin ? '#15803d' : '#b45309',
                              border: `1px solid ${user.chatUnlockedByAdmin ? '#86efac' : '#fde68a'}`,
                            }}
                            onClick={() => handleToggleChatUnlock(user._id)}
                            title="Toggle Admin Chat Unlock"
                          >
                            {user.chatUnlockedByAdmin ? 'Chat Unlocked' : 'Unlock Chat'}
                          </button>
                          <button
                            className="dash-btn dash-btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444', borderColor: '#fca5a5' }}
                            onClick={() => handleDelete(user._id)}
                          >
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
