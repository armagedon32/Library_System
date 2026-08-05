import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import Logo from '../components/Logo';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      authLogin(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="card shadow-sm border-0" style={{ width: '420px', borderRadius: '12px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-white border rounded-3 mb-3 p-2" style={{ width: '64px', height: '64px' }}>
              <Logo size={48} />
            </div>
            <h4 className="fw-bold mb-1">Library System</h4>
            <p className="text-muted small mb-0">Sign in to your account</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center py-2 small" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium text-secondary">Email address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-envelope text-muted"></i>
                </span>
                <input
                  type="email"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="you@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-medium text-secondary">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-lock text-muted"></i>
                </span>
                <input
                  type="password"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-dark w-100 py-2 fw-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-muted small mt-4 mb-0">
            Don't have an account?{' '}
            <Link to="/register" className="text-dark fw-medium text-decoration-none">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;