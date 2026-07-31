import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api/analytics';

function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateSettings(settings);
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Failed to save settings');
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

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Admin Settings</h4>
        <p className="text-muted small mb-0">Configure clustering parameters and decision thresholds</p>
      </div>

      {message && (
        <div className={`alert alert-${message.includes('success') ? 'success' : 'danger'} d-flex align-items-center py-2 small`}>
          <i className={`bi ${message.includes('success') ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-diagram-3 me-2"></i>Clustering Parameters</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-medium">Max Clusters</label>
                <input type="number" className="form-control"
                  value={settings?.clustering?.maxClusters || 5}
                  onChange={(e) => setSettings({ ...settings, clustering: { ...settings.clustering, maxClusters: parseInt(e.target.value) } })} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-medium">Min Items</label>
                <input type="number" className="form-control"
                  value={settings?.clustering?.minItemsForClustering || 10}
                  onChange={(e) => setSettings({ ...settings, clustering: { ...settings.clustering, minItemsForClustering: parseInt(e.target.value) } })} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-medium">Usage Weight</label>
                <input type="number" step="0.1" className="form-control"
                  value={settings?.clustering?.usageWeight || 0.4}
                  onChange={(e) => setSettings({ ...settings, clustering: { ...settings.clustering, usageWeight: parseFloat(e.target.value) } })} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-medium">Retention Weight</label>
                <input type="number" step="0.1" className="form-control"
                  value={settings?.clustering?.retentionWeight || 0.3}
                  onChange={(e) => setSettings({ ...settings, clustering: { ...settings.clustering, retentionWeight: parseFloat(e.target.value) } })} />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white pt-4 px-4 border-bottom-0">
            <h6 className="fw-bold mb-0"><i className="bi bi-sliders me-2"></i>Decision Thresholds</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-medium">Retire Threshold</label>
                <input type="number" step="0.1" className="form-control"
                  value={settings?.thresholds?.retireThreshold || 2}
                  onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, retireThreshold: parseFloat(e.target.value) } })} />
                <small className="text-muted">Items below this score may be retired</small>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-medium">Keep Threshold</label>
                <input type="number" step="0.1" className="form-control"
                  value={settings?.thresholds?.keepThreshold || 8}
                  onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, keepThreshold: parseFloat(e.target.value) } })} />
                <small className="text-muted">Items above this score should be kept</small>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-medium">Flag Threshold</label>
                <input type="number" step="0.1" className="form-control"
                  value={settings?.thresholds?.flagThreshold || 5}
                  onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, flagThreshold: parseFloat(e.target.value) } })} />
                <small className="text-muted">Items between retire and flag</small>
              </div>
            </div>
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