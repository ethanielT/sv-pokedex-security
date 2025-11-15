import AuthForm from '../components/AuthForm';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div>
      <AuthForm type="login" onSuccess={() => navigate('/')} />
      <p>
        Don't have an account?{' '}
        <button onClick={() => navigate('/register')}>
          Register
        </button>
      </p>
    </div>
  );
}
