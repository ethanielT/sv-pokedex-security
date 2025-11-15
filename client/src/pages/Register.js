import AuthForm from '../components/AuthForm';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
      if (localStorage.getItem('token')) {
        navigate('/');
      }
    }, [navigate]);

  return (
    <div>
      <AuthForm type="register" onSuccess={() => navigate('/')} />
      <p>
        Already have an account?{' '}
        <button onClick={() => navigate('/')}>
          Login
        </button>
      </p>
    </div>
  );
}

