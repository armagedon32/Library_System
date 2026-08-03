import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../api/auth';
import { useToast } from '../components/Toast';

const DEPARTMENTS = ['Education', 'BSBA', 'BSHM', 'Computer Science'];

function MySettings() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('profile');

  const [profile, setProfile] = useState({
    name: user?.name || '',
    department: user?.department || '',
    academicLevel: user?.academicLevel || '',
    contactNumber: user?.contactNumber || '',
  });
  const [pass, setPass] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      await refreshUser();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pass.newPassword !== pass.confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pass.currentPassword, newPassword: pass.newPassword });
      addToast('Password updated successfully!', 'success');
      setPass({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'profile', label: 'User Profile', icon: 'bi-person-circle' },
    { key: 'security', label: 'Account Security', icon: 'bi-shield-lock' },
    { key: 'information', label: 'Information', icon: 'bi-info-circle' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Account Settings</h4>
        <p className="text-muted small mb-0">Manage your profile, security, and account information</p>
      </div>

      <nav className="nav nav-pills flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`bi ${t.icon} me-1`}></i>{t.label}
          </button>
        ))}
      </nav>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="card border-0 shadow-sm">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-person-circle me-2"></i>User Profile</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-medium">Full Name *</label>
                <input className="form-control" value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Department</label>
                <select className="form-select" value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Academic Level</label>
                <select className="form-select" value={profile.academicLevel}
                  onChange={(e) => setProfile({ ...profile, academicLevel: e.target.value })}>
                  <option value="">Select Level</option>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Contact Number</label>
                <input className="form-control" placeholder="09XX XXX XXXX" value={profile.contactNumber}
                  onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="card-footer bg-white border-top-0">
            <button type="submit" className="btn btn-dark px-4" disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Profile</>}
            </button>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={savePassword} className="card border-0 shadow-sm">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-shield-lock me-2"></i>Account Security</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-medium">Current Password *</label>
                <input type="password" className="form-control" value={pass.currentPassword}
                  onChange={(e) => setPass({ ...pass, currentPassword: e.target.value })} required />
              </div>
              <div className="col-md-6"></div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">New Password *</label>
                <input type="password" className="form-control" value={pass.newPassword}
                  onChange={(e) => setPass({ ...pass, newPassword: e.target.value })} required minLength={6} />
                <small className="text-muted">At least 6 characters</small>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-medium">Confirm New Password *</label>
                <input type="password" className="form-control" value={pass.confirmPassword}
                  onChange={(e) => setPass({ ...pass, confirmPassword: e.target.value })} required />
              </div>
            </div>
          </div>
          <div className="card-footer bg-white border-top-0">
            <button type="submit" className="btn btn-dark px-4" disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-key me-1"></i>Change Password</>}
            </button>
          </div>
        </form>
      )}

      {tab === 'information' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-info-circle me-2"></i>Account Information</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {[
                { label: 'Email Address', value: user?.email },
                { label: 'Role', value: user?.role },
                { label: 'Department', value: user?.department || '—' },
                { label: 'Academic Level', value: user?.academicLevel || '—' },
                { label: 'Contact Number', value: user?.contactNumber || '—' },
                { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
              ].map((f) => (
                <div className="col-md-6" key={f.label}>
                  <div className="p-3 rounded-3 bg-light">
                    <small className="text-muted d-block">{f.label}</small>
                    <strong>{f.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MySettings;