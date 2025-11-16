import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setMessage('Invalid or missing reset link');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    // Validate
    const newErrors = {};
    if (!newPassword) newErrors.password = 'Password is required';
    else if (newPassword.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[a-zA-Z]/.test(newPassword)) newErrors.password = 'Must contain at least one letter';
    else if (!/[0-9]/.test(newPassword)) newErrors.password = 'Must contain at least one number';

    if (!confirmPassword) newErrors.confirm = 'Please confirm your password';
    else if (newPassword !== confirmPassword) newErrors.confirm = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/auth/reset-password', {
        token,
        email,
        newPassword
      });
      setMessage(res.data.message + ' Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Reset Password</h2>

      {message && (
        <div style={{ 
          color: message.includes('Redirecting') ? 'green' : 'red', 
          marginBottom: '15px',
          padding: '10px',
          borderRadius: '4px',
          backgroundColor: message.includes('Redirecting') ? '#e8f5e9' : '#ffebee'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {errors.password && <div style={{ color: 'red', fontSize: '12px' }}>{errors.password}</div>}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {errors.confirm && <div style={{ color: 'red', fontSize: '12px' }}>{errors.confirm}</div>}
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          style={{ width: '100%', padding: '10px', cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p style={{ marginTop: '15px', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/login')}
          style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Back to Login
        </button>
      </p>
    </div>
  );
}
