import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, registerAdmin } from '../api/auth';
import Logo from '../components/Logo';

function Register() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', department: '', studentId: '', adminKey: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (isAdmin && !formData.adminKey) {
      setError('Admin key is required');
      return;
    }
    setLoading(true);
    try {
      let user;
      if (isAdmin) {
        user = await registerAdmin({
          name: formData.name, email: formData.email,
          password: formData.password, department: formData.department,
          adminKey: formData.adminKey
        });
      } else {
        const { adminKey, confirmPassword, ...userData } = formData;
        user = await register(userData);
      }
      authLogin(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="card shadow-sm border-0" style={{ width: '440px', borderRadius: '12px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-white border rounded-3 mb-3 p-2" style={{ width: '64px', height: '64px' }}>
              <Logo size={48} />
            </div>
            <h4 className="fw-bold mb-1">Create Account</h4>
            <p className="text-muted small mb-0">Register for the Library System</p>
          </div>

          <div className="d-flex mb-4 border rounded-3 p-1 bg-light">
            <button
              onClick={() => { setIsAdmin(false); setError(''); }}
              className={`btn btn-sm flex-fill border-0 fw-medium ${!isAdmin ? 'btn-light shadow-sm' : 'text-muted bg-transparent'}`}
            >
              <i className="bi bi-person me-1"></i>User
            </button>
            <button
              onClick={() => { setIsAdmin(true); setError(''); }}
              className={`btn btn-sm flex-fill border-0 fw-medium ${isAdmin ? 'btn-light shadow-sm' : 'text-muted bg-transparent'}`}
            >
              <i className="bi bi-shield-lock me-1"></i>Admin
            </button>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center py-2 small" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium text-secondary">Full name</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-person text-muted"></i>
                </span>
                <input type="text" name="name" className="form-control bg-light border-start-0 ps-0" placeholder="Juan Dela Cruz" value={formData.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-medium text-secondary">Email address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-envelope text-muted"></i>
                </span>
                <input type="email" name="email" className="form-control bg-light border-start-0 ps-0" placeholder="you@university.edu" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            {!isAdmin && (
              <div className="mb-3">
                <label className="form-label small fw-medium text-secondary">Student ID</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-credit-card text-muted"></i>
                  </span>
                  <input type="text" name="studentId" className="form-control bg-light border-start-0 ps-0" placeholder="e.g., 2024-0001" value={formData.studentId} onChange={handleChange} />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label small fw-medium text-secondary">Department</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-building text-muted"></i>
                </span>
                <input type="text" name="department" className="form-control bg-light border-start-0 ps-0" placeholder="Education, BSBA, BSHM, CS" value={formData.department} onChange={handleChange} />
              </div>
            </div>

            {isAdmin && (
              <div className="mb-3">
                <label className="form-label small fw-medium text-secondary">Admin key</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-key text-muted"></i>
                  </span>
                  <input type="password" name="adminKey" className="form-control bg-light border-start-0 ps-0" placeholder="Enter admin secret key" value={formData.adminKey} onChange={handleChange} />
                </div>
              </div>
            )}

            <div className="row mb-4">
              <div className="col-6">
                <label className="form-label small fw-medium text-secondary">Password</label>
                <input type="password" name="password" className="form-control bg-light" placeholder="Min 6 chars" value={formData.password} onChange={handleChange} required minLength={6} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-medium text-secondary">Confirm</label>
                <input type="password" name="confirmPassword" className="form-control bg-light" placeholder="Repeat" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn btn-dark w-100 py-2 fw-medium" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Creating account...
                </>
              ) : (
                <><i className="bi bi-person-plus me-2"></i>Create {isAdmin ? 'Admin' : 'User'} Account</>
              )}
            </button>
          </form>

          <p className="text-center text-muted small mt-4 mb-0">
            Already have an account?{' '}
            <Link to="/login" className="text-dark fw-medium text-decoration-none">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;