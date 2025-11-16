import AuthForm from '../components/AuthForm';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [submittingForgot, setSubmittingForgot] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (!forgotEmail) {
      setForgotError('Please enter your email');
      return;
    }

    setSubmittingForgot(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(res.data.message);
      setForgotEmail('');
      setTimeout(() => setShowForgotPassword(false), 3000);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'An error occurred');
    } finally {
      setSubmittingForgot(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <AuthForm type="login" onSuccess={() => navigate('/')} />
        
        <div className="divider">or</div>
        
        <div className="auth-link">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')}>
            Register here
          </button>
        </div>

        <div className="divider">─</div>

        <div className="auth-link">
          <button 
            onClick={() => setShowForgotPassword(true)}
            style={{ marginTop: '10px' }}
          >
            Forgot your password?
          </button>
        </div>
      </div>

      {showForgotPassword && (
        <div className="modal-backdrop">
          <div className="forgot-modal">
            <h2>Reset Password</h2>
            
            {forgotMessage && (
              <div className="modal-message success">
                {forgotMessage}
              </div>
            )}
            
            {forgotError && (
              <div className="modal-message error">
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <div className="modal-buttons">
                <button 
                  type="submit" 
                  disabled={submittingForgot}
                  className="btn-primary"
                >
                  {submittingForgot ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
