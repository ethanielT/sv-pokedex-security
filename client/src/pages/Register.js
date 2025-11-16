import AuthForm from '../components/AuthForm';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
      if (localStorage.getItem('token')) {
        navigate('/');
      }
    }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <AuthForm type="register" onSuccess={() => navigate('/')} />
        
        <div className="divider">or</div>
        
        <div className="auth-link">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')}>
            Login here
          </button>
        </div>
      </div>
    </div>
  );
}

