import React, { useState } from 'react';
import axios from 'axios';

export default function AuthForm({ type, onSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ username: null, email: null, password: null });
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const clientValidate = () => {
    const errors = { username: null, email: null, password: null };
    if (!username || typeof username !== 'string') errors.username = 'Username is required';
    else if (username.length < 4) errors.username = 'Username must be at least 4 characters';
    else if (username.length > 30) errors.username = 'Username must be at most 30 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = 'Only letters, numbers and underscores allowed';

    if (type === 'register') {
      if (!email || typeof email !== 'string') errors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please provide a valid email address';
    }

    if (!password || typeof password !== 'string') errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/[a-zA-Z]/.test(password)) errors.password = 'Password must contain at least one letter';
    else if (!/[0-9]/.test(password)) errors.password = 'Password must contain at least one number';

    setFieldErrors(errors);

    return !errors.username && !errors.email && !errors.password;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGeneralError(null);

    if (!clientValidate()) return;

    setSubmitting(true);
    try {
      const payload = { username, password };
      if (type === 'register') {
        payload.email = email;
      }
      
      const res = await axios.post(`/api/auth/${type}`, payload);
      const token = res.data.token;
      const expiresIn = res.data.expiresIn;
      
      localStorage.setItem('token', token);
      localStorage.setItem('tokenExpire', Date.now() + expiresIn * 1000);
      localStorage.setItem('userRole', res.data.role);
      onSuccess();
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.fieldErrors) {
          setFieldErrors({
            username: data.fieldErrors.username || null,
            email: data.fieldErrors.email || null,
            password: data.fieldErrors.password || null,
          });
        } else if (data.error) {
          // For login, simplify error message
          if (type === 'login') {
            setGeneralError('Username and password combination does not exist');
          } else {
            setGeneralError(data.error);
          }
        }
      } else {
        setGeneralError('Network error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>{type === 'login' ? 'Login' : 'Create Account'}</h2>

      {generalError && <div className="error-message">{generalError}</div>}

      <div className="form-group">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          aria-invalid={!!fieldErrors.username}
        />
        {fieldErrors.username && <span className="error-text">{fieldErrors.username}</span>}
      </div>

      {type === 'register' && (
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
        </div>
      )}

      <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Please wait...' : (type === 'login' ? 'Login' : 'Register')}
      </button>
    </form>
  );
}
