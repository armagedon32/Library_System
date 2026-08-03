import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api/analytics';
import { useToast } from '../components/Toast';

function Field({ label, hint, value, type = 'number', step, onChange }) {
  return (
    <div className="col-md-4">
      <label className="form-label small fw-medium">{label}</label>
      <input type={type} step={step} className="form-control" value={value} onChange={onChange} />
      {hint && <small className="text-muted">{hint}</small>}
    </div>
  );
}

function AdminSettings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('borrowing');

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const setGroup = (group, key, value) => {
    setSettings({ ...settings, [group]: { ...settings[group], [key]: value } });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);
      addToast('Settings saved successfully!', 'success');
    } catch (error) {
      addToast('Failed to save settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const tabs = [
    { key: 'borrowing', label: 'Borrowing', icon: 'bi-bookmark-check' },
    { key: 'fines', label: 'Fines', icon: 'bi-cash-coin' },
    { key: 'reservations', label: 'Reservations', icon: 'bi-pin-angle' },
    { key: 'notifications', label: 'Notifications', icon: 'bi-bell' },
    { key: 'clustering', label: 'Clustering', icon: 'bi-diagram-3' },
    { key: 'thresholds', label: 'Thresholds', icon: 'bi-sliders' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Admin Settings</h4>
        <p className="text-muted small mb-0">Configure lending policies, fines, reservations, notifications & decision parameters</p>
      </div>

      <nav className="nav nav-pills flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.key} type="button"
            className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <i className={`bi ${t.icon} me-1`}></i>{t.label}
          </button>
        ))}
      </nav>

      <form onSubmit={handleSave}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0">
              <i className={`bi ${tabs.find((t) => t.key === activeTab).icon} me-2`}></i>
              {tabs.find((t) => t.key === activeTab).label}
            </h6>
          </div>
          <div className="card-body">
            {activeTab === 'borrowing' && (
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
            {activeTab === 'fines' && (
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
            {activeTab === 'reservations' && (
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
            {activeTab === 'notifications' && (
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
            {activeTab === 'clustering' && (
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
            {activeTab === 'thresholds' && (
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
              </div>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-dark px-4" disabled={saving}>
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
            ) : (
              <><i className="bi bi-check-lg me-1"></i>Save Settings</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminSettings;