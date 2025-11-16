import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, clearTokens } from '../utils/tokenManager';
import '../styles/AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = getToken();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const [currentUserId, setCurrentUserId] = useState(null);

  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.id;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const userId = decodeToken(token);
    setCurrentUserId(userId);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      const usersRes = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData = await usersRes.json();
      console.log('Users data:', usersData);
      setUsers(Array.isArray(usersData) ? usersData : []);

      const logsRes = await fetch(`${API_URL}/api/admin/activity-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!logsRes.ok) throw new Error('Failed to fetch activity logs');
      const logsData = await logsRes.json();
      setActivityLogs(logsData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRoleValue) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRoleValue })
      });

      if (!res.ok) throw new Error('Failed to update role');

      const updatedUser = await res.json();
      setUsers(users.map(u => u._id === userId ? updatedUser : u));
      setSelectedUser(null);
      setError(null);
    } catch (err) {
      setError('Failed to update user role');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete user');

      setUsers(users.filter(u => u._id !== userId));
      setSelectedUser(null);
      setError(null);
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  if (loading) return <div className="admin-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>Back to Home</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {stats && (
        <div className="stats-section">
          <h2>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-number">{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>Admins</h3>
              <p className="stat-number">{stats.adminCount}</p>
            </div>
            <div className="stat-card">
              <h3>Regular Users</h3>
              <p className="stat-number">{stats.userCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="users-section">
        <h2>User Management</h2>
        {users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                        }}
                        disabled={user._id === currentUserId}
                        style={user._id === currentUserId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        title={user._id === currentUserId ? 'Cannot edit yourself' : ''}
                      >
                        Edit
                      </button>
                      {user._id !== currentUserId && (
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit User: {selectedUser.username}</h3>
            <div className="form-group">
              <label>Role:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => handleRoleChange(selectedUser._id, newRole)}
              >
                Update
              </button>
              <button
                className="btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activityLogs && (
        <div className="activity-section">
          <h2>Activity Logs</h2>
          
          <div className="activity-grid">
            <div className="activity-card">
              <h3>Recent Logins</h3>
              {activityLogs.recentLogins.length > 0 ? (
                <ul>
                  {activityLogs.recentLogins.map(log => (
                    <li key={log._id}>
                      <strong>{log.userId?.username || 'Unknown'}</strong>
                      <br />
                      <small>{new Date(log.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No recent logins</p>}
            </div>

            <div className="activity-card">
              <h3>Failed Login Attempts</h3>
              {activityLogs.failedAttempts.length > 0 ? (
                <ul>
                  {activityLogs.failedAttempts.map(log => (
                    <li key={log._id} style={{ color: '#d32f2f' }}>
                      <strong>{log.userId?.username || 'Unknown'}</strong>
                      <br />
                      <small>{new Date(log.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No failed attempts</p>}
            </div>

            <div className="activity-card">
              <h3>Account Lockouts</h3>
              {activityLogs.accountLockouts.length > 0 ? (
                <ul>
                  {activityLogs.accountLockouts.map(log => (
                    <li key={log._id} style={{ color: '#f57c00' }}>
                      <strong>{log.userId?.username || 'Unknown'}</strong>
                      <br />
                      <small>{new Date(log.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No recent lockouts</p>}
            </div>

            <div className="activity-card">
              <h3>Password Changes</h3>
              {activityLogs.passwordChanges.length > 0 ? (
                <ul>
                  {activityLogs.passwordChanges.map(log => (
                    <li key={log._id} style={{ color: '#1976d2' }}>
                      <strong>{log.userId?.username || 'Unknown'}</strong>
                      <br />
                      <small>{log.action === 'PASSWORD_RESET' ? '🔗 Reset' : '🔐 Changed'}</small>
                      <br />
                      <small>{new Date(log.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No recent changes</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
