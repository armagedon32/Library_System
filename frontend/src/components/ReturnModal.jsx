import { useState, useEffect } from 'react';

const conditions = ['New', 'Good', 'Fair', 'Poor'];

function ReturnModal({ show, record, onClose, onConfirm }) {
  const [form, setForm] = useState({
    condition: 'Good',
    isDamaged: false,
    damageDescription: '',
    missingCount: 0,
    notes: ''
  });

  useEffect(() => {
    if (show) {
      setForm({
        condition: 'Good',
        isDamaged: false,
        damageDescription: '',
        missingCount: 0,
        notes: ''
      });
    }
  }, [show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(form);
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold"><i className="bi bi-arrow-return-left me-2"></i>Return Item</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Returning: <strong>{record?.collectionItem?.title || record?.title || 'Unknown'}</strong></small>
                <small className="text-muted d-block">Borrower: <strong>{record?.borrowerName || record?.collectionItem?.borrowerName || 'Unknown'}</strong></small>
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-medium">Condition upon Return *</label>
                  <select name="condition" className="form-select" value={form.condition} onChange={handleChange} required>
                    {conditions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="isDamaged" name="isDamaged"
                      checked={form.isDamaged} onChange={handleChange} />
                    <label className="form-check-label small fw-medium" htmlFor="isDamaged">
                      <i className="bi bi-exclamation-triangle text-danger me-1"></i>Item is damaged
                    </label>
                  </div>
                </div>

                {form.isDamaged && (
                  <div className="col-12">
                    <label className="form-label small fw-medium">Damage Description *</label>
                    <textarea name="damageDescription" className="form-control" rows="2"
                      placeholder="Describe the damage..." value={form.damageDescription}
                      onChange={handleChange} required></textarea>
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label small fw-medium">Missing Copies</label>
                  <div className="input-group">
                    <input type="number" name="missingCount" className="form-control" min="0" max="1"
                      value={form.missingCount} onChange={handleChange} />
                    <span className="input-group-text small bg-light">/ 1 borrowed</span>
                  </div>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>Number of copies not returned</small>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-medium">Return Notes</label>
                  <textarea name="notes" className="form-control" rows="2"
                    placeholder="Additional notes..." value={form.notes}
                    onChange={handleChange}></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success" disabled={form.isDamaged && !form.damageDescription}>
                <i className="bi bi-check-lg me-1"></i>Confirm Return
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReturnModal;