import { useState } from 'react';
import { createCollectionItem } from '../api/analytics';

const conditions = ['New', 'Good', 'Fair', 'Poor'];

function AddItemModal({ show, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', description: '',
    publishYear: new Date().getFullYear(), publisher: '', location: '',
    condition: 'New', cost: 0, copies: 1
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createCollectionItem(form);
      onSuccess();
      onClose();
      setForm({ title: '', author: '', isbn: '', description: '', publishYear: new Date().getFullYear(), publisher: '', location: '', condition: 'New', cost: 0, copies: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold"><i className="bi bi-plus-circle me-2"></i>Add Collection Item</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-medium">Title *</label>
                  <input name="title" className="form-control" value={form.title} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Author *</label>
                  <input name="author" className="form-control" value={form.author} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">ISBN *</label>
                  <input name="isbn" className="form-control" value={form.isbn} onChange={handleChange} required />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-medium">Description</label>
                  <textarea name="description" className="form-control" rows="2" placeholder="Describe the book content (auto-classifies department)" value={form.description} onChange={handleChange}></textarea>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-medium">Publish Year *</label>
                  <input type="number" name="publishYear" className="form-control" value={form.publishYear} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Publisher</label>
                  <input name="publisher" className="form-control" value={form.publisher} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Location</label>
                  <input name="location" className="form-control" placeholder="e.g. Shelf A-12" value={form.location} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-medium">Condition</label>
                  <select name="condition" className="form-select" value={form.condition} onChange={handleChange}>
                    {conditions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-medium">Cost</label>
                  <input type="number" name="cost" className="form-control" value={form.cost} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-medium">Copies</label>
                  <input type="number" name="copies" className="form-control" min="1" value={form.copies} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-save me-1"></i>Save Item</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddItemModal;