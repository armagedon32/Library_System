import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../api/auth';
import { getSettings, updateSettings, getBackups, createBackup, restoreBackup, deleteBackupApi } from '../api/analytics';
import { useToast } from '../components/Toast';

const DEPARTMENTS = ['Education', 'BSBA', 'BSHM', 'Computer Science'];

function Field({ label, hint, value, type = 'number', step, onChange }) {
  return (
    <div className="col-md-4">
      <label className="form-label small fw-medium">{label}</label>
      <input type={type} step={step} className="form-control" value={value} onChange={onChange} />
      {hint && <small className="text-muted">{hint}</small>}
    </div>
  );
}

function Settings() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('profile');

  // User profile / security
  const [profile, setProfile] = useState({
    name: user?.name || '',
    department: user?.department || '',
    academicLevel: user?.academicLevel || '',
    contactNumber: user?.contactNumber || '',
  });
  const [pass, setPass] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  // System settings (admin only)
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Backup & Restore (admin only)
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      getSettings().then(setSettings).catch(() => setSettings(null));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'backup' && isAdmin) {
      loadBackups();
    }
  }, [tab, isAdmin]);

  const loadBackups = async () => {
    try {
      const data = await getBackups();
      setBackups(data.backups || []);
    } catch (err) {
      console.error('Failed to load backups');
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      await createBackup();
      addToast('Backup created successfully!', 'success');
      loadBackups();
    } catch (err) {
      addToast(err.response?.data?.message || 'Backup failed', 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (backupName) => {
    if (!confirm(`Are you sure you want to restore from backup "${backupName}"? This will overwrite current data.`)) return;
    setRestoreLoading(true);
    try {
      await restoreBackup(backupName, true);
      addToast('Restore completed successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Restore failed', 'danger');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDeleteBackup = async (backupName) => {
    if (!confirm(`Are you sure you want to delete backup "${backupName}"?`)) return;
    try {
      await deleteBackupApi(backupName);
      addToast('Backup deleted successfully!', 'success');
      loadBackups();
    } catch (err) {
      addToast(err.response?.data?.message || 'Delete failed', 'danger');
    }
  };

  const setGroup = (group, key, value) => {
    setSettings({ ...settings, [group]: { ...settings[group], [key]: value } });
  };

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

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(settings);
      addToast('Settings saved successfully!', 'success');
    } catch (error) {
      addToast('Failed to save settings', 'danger');
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { key: 'profile', label: 'User Profile', icon: 'bi-person-circle' },
    { key: 'security', label: 'Account Security', icon: 'bi-shield-lock' },
    { key: 'information', label: 'Information', icon: 'bi-info-circle' },
    ...(isAdmin ? [
      { key: 'borrowing', label: 'Borrowing', icon: 'bi-bookmark-check' },
      { key: 'fines', label: 'Fines', icon: 'bi-cash-coin' },
      { key: 'reservations', label: 'Reservations', icon: 'bi-pin-angle' },
      { key: 'notifications', label: 'Notifications', icon: 'bi-bell' },
      { key: 'clustering', label: 'Clustering', icon: 'bi-diagram-3' },
      { key: 'thresholds', label: 'Thresholds', icon: 'bi-sliders' },
      { key: 'backup', label: 'Backup & Restore', icon: 'bi-cloud-download' },
    ] : []),
  ];

  const isAdminTab = isAdmin && ['borrowing', 'fines', 'reservations', 'notifications', 'clustering', 'thresholds', 'backup'].includes(tab);

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Settings</h4>
        <p className="text-muted small mb-0">
          {isAdmin
            ? 'Manage your account and system configuration (lending policies, fines, reservations, notifications & decision parameters)'
            : 'Manage your profile, security, and account information'}
        </p>
      </div>

      <nav className="nav nav-pills flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.key} type="button"
            className={`nav-link ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
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
                <label className="form-label small fw-medium">Student ID</label>
                <input className="form-control" placeholder="e.g., 2024-0001" value={profile.studentId || ''}
                  onChange={(e) => setProfile({ ...profile, studentId: e.target.value })} />
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
                { label: 'Student ID', value: user?.studentId || '—' },
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

      {tab === 'information' && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-eye me-2"></i>Display Preferences</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="showBookCovers"
                    checked={localStorage.getItem('showBookCovers') !== 'false'}
                    onChange={(e) => {
                      localStorage.setItem('showBookCovers', e.target.checked);
                      window.dispatchEvent(new Event('storage'));
                    }} />
                  <label className="form-check-label" htmlFor="showBookCovers">
                    <strong>Show Book Cover Images</strong>
                    <br /><small className="text-muted">Toggle to show or hide book cover images in the collection list</small>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdminTab && !settings && (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      )}

      {isAdminTab && settings && (
        <form onSubmit={handleSaveSettings}>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white pt-4 px-4 border-bottom-0">
              <h6 className="fw-bold mb-0">
                <i className={`bi ${tabs.find((t) => t.key === tab).icon} me-2`}></i>
                {tabs.find((t) => t.key === tab).label}
              </h6>
            </div>
            <div className="card-body">
              {tab === 'borrowing' && (
                <div className="row g-3">
                  <Field label="Loan Period (days)" hint="Max days a borrower can keep an item"
                    value={settings.borrowing.maxDays}
                    onChange={(e) => setGroup('borrowing', 'maxDays', parseInt(e.target.value) || 0)} />
                  <Field label="Max Renewals" hint="Allowed renewals per borrow"
                    value={settings.borrowing.maxRenewals}
                    onChange={(e) => setGroup('borrowing', 'maxRenewals', parseInt(e.target.value) || 0)} />
                  <Field label="Renewal Period (days)" hint="Extra days per renewal"
                    value={settings.borrowing.renewalDays}
                    onChange={(e) => setGroup('borrowing', 'renewalDays', parseInt(e.target.value) || 0)} />
                  <Field label="Min Days Before Renew" hint="Earliest days to renew"
                    value={settings.borrowing.minDaysBeforeRenew}
                    onChange={(e) => setGroup('borrowing', 'minDaysBeforeRenew', parseInt(e.target.value) || 0)} />
                </div>
              )}
              {tab === 'fines' && (
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-medium d-block">Enable Overdue Fines</label>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={settings.fines.enabled}
                        onChange={(e) => setGroup('fines', 'enabled', e.target.checked)} />
                      <label className="form-check-label small">Charge fines on late returns</label>
                    </div>
                  </div>
                  <Field label="Fine per Day" hint="Amount charged per overdue day"
                    value={settings.fines.finePerDay}
                    onChange={(e) => setGroup('fines', 'finePerDay', parseFloat(e.target.value) || 0)} />
                  <Field label="Grace Period (days)" hint="Days after due before fine applies"
                    value={settings.fines.graceDays}
                    onChange={(e) => setGroup('fines', 'graceDays', parseInt(e.target.value) || 0)} />
                  <Field label="Max Fine" hint="Capped total fine amount"
                    value={settings.fines.maxFine}
                    onChange={(e) => setGroup('fines', 'maxFine', parseFloat(e.target.value) || 0)} />
                </div>
              )}
              {tab === 'reservations' && (
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Enable Reservations</label>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={settings.reservations.enabled}
                        onChange={(e) => setGroup('reservations', 'enabled', e.target.checked)} />
                      <label className="form-check-label small">Allow users to reserve books</label>
                    </div>
                  </div>
                  <Field label="Hold Days (max)" hint="Days to claim a reserved book"
                    value={settings.reservations.maxHoldDays}
                    onChange={(e) => setGroup('reservations', 'maxHoldDays', parseInt(e.target.value) || 0)} />
                  <Field label="Reservations per User" hint="Max active reservations"
                    value={settings.reservations.reservationsPerUser}
                    onChange={(e) => setGroup('reservations', 'reservationsPerUser', parseInt(e.target.value) || 0)} />
                </div>
              )}
              {tab === 'notifications' && (
                <div className="row g-3">
                  <Field label="Due Reminder (days before)" hint="Remind borrowers before due date"
                    value={settings.notifications.dueReminderDays}
                    onChange={(e) => setGroup('notifications', 'dueReminderDays', parseInt(e.target.value) || 0)} />
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Available-Notice</label>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={settings.notifications.availabilityNotice}
                        onChange={(e) => setGroup('notifications', 'availabilityNotice', e.target.checked)} />
                      <label className="form-check-label small">Notify when a reserved book becomes available</label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Email Alerts</label>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={settings.notifications.emailAlerts}
                        onChange={(e) => setGroup('notifications', 'emailAlerts', e.target.checked)} />
                      <label className="form-check-label small">Send email notifications</label>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'clustering' && (
                <div className="row g-3">
                  <Field label="Max Clusters" value={settings.clustering.maxClusters}
                    onChange={(e) => setGroup('clustering', 'maxClusters', parseInt(e.target.value) || 1)} />
                  <Field label="Min Items" value={settings.clustering.minItemsForClustering}
                    onChange={(e) => setGroup('clustering', 'minItemsForClustering', parseInt(e.target.value) || 2)} />
                  <Field label="Usage Weight" step="0.1" value={settings.clustering.usageWeight}
                    onChange={(e) => setGroup('clustering', 'usageWeight', parseFloat(e.target.value) || 0)} />
                  <Field label="Retention Weight" step="0.1" value={settings.clustering.retentionWeight}
                    onChange={(e) => setGroup('clustering', 'retentionWeight', parseFloat(e.target.value) || 0)} />
                </div>
              )}
              {tab === 'thresholds' && (
                <div className="row g-3">
                  <Field label="Retire Threshold" step="0.1" value={settings.thresholds.retireThreshold}
                    hint="Items below may be retired"
                    onChange={(e) => setGroup('thresholds', 'retireThreshold', parseFloat(e.target.value) || 0)} />
                  <Field label="Keep Threshold" step="0.1" value={settings.thresholds.keepThreshold}
                    hint="Items above should be kept"
                    onChange={(e) => setGroup('thresholds', 'keepThreshold', parseFloat(e.target.value) || 0)} />
                  <Field label="Flag Threshold" step="0.1" value={settings.thresholds.flagThreshold}
                    hint="Items between retire and keep"
                    onChange={(e) => setGroup('thresholds', 'flagThreshold', parseFloat(e.target.value) || 0)} />
                  <Field label="Service Per Copy" step="1" value={settings.thresholds.servicePerCopy}
                    hint="Estimated borrows one copy can serve per year (drives Projected Addition)"
                    onChange={(e) => setGroup('thresholds', 'servicePerCopy', parseInt(e.target.value, 10) || 1)} />
                </div>
              )}
              {tab === 'backup' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h6 className="fw-bold mb-1">Backup & Restore</h6>
                      <p className="text-muted small mb-0">Create backups or restore from previous backups</p>
                    </div>
                    <button className="btn btn-dark btn-sm" onClick={handleCreateBackup} disabled={backupLoading}>
                      {backupLoading ? (
                        <><span className="spinner-border spinner-border-sm me-1"></span>Creating...</>
                      ) : (
                        <><i className="bi bi-plus-lg me-1"></i>Create Backup</>
                      )}
                    </button>
                  </div>

                  {backups.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-cloud-download fs-1 d-block mb-2"></i>
                      <p>No backups yet. Create your first backup to protect your data.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Backup Name</th>
                            <th>Documents</th>
                            <th>Collections</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backups.map((b) => (
                            <tr key={b.name}>
                              <td>
                                <i className="bi bi-archive me-2 text-muted"></i>
                                {b.name}
                              </td>
                              <td>{b.totalDocuments.toLocaleString()}</td>
                              <td>
                                {Object.keys(b.collections).map((c) => (
                                  <span key={c} className="badge bg-light text-dark me-1">{c}</span>
                                ))}
                              </td>
                              <td className="text-end">
                                <button className="btn btn-outline-success btn-sm me-1" onClick={() => handleRestore(b.name)} disabled={restoreLoading}>
                                  <i className="bi bi-arrow-counterclockwise me-1"></i>Restore
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteBackup(b.name)}>
                                  <i className="bi bi-trash me-1"></i>Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-dark px-4" disabled={savingSettings}>
              {savingSettings ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
              ) : (
                <><i className="bi bi-check-lg me-1"></i>Save Settings</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Settings;
