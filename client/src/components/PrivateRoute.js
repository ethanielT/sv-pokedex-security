import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getToken, isTokenExpired, clearTokens } from '../utils/tokenManager';

export default function PrivateRoute({ children, requiredRole = null }) {
  const token = getToken();
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole'));
  const [loading, setLoading] = useState(requiredRole && !userRole);

  useEffect(() => {
    if (isTokenExpired()) {
      clearTokens();
      return;
    }

    if (token && requiredRole && !userRole) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch role');
        return res.json();
      })
      .then(data => {
        setUserRole(data.role);
        localStorage.setItem('userRole', data.role);
        setLoading(false);
      })
      .catch(() => {
        clearTokens();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token, requiredRole, userRole]);

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && loading) {
    return <div>Loading...</div>;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
}
