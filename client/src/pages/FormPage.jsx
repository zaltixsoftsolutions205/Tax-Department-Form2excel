import { useState, useRef, useCallback } from 'react';
import api from '../api';

const INITIAL = {
  name: '', parentsName: '', religion: '', caste: '',
  maritalStatus: '', designation: '', division: '', circle: '',
  educationQualifications: '', residenceAddress: '', interests: '',
};

export default function FormPage() {
  const [form,       setForm]       = useState(INITIAL);
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [serverMsg,  setServerMsg]  = useState('');
  const fileRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  }, []);

  const handleFile = useCallback((e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(picked.type)) {
      setErrors(p => ({ ...p, file: 'Only JPEG / PNG images are allowed.' })); return;
    }
    if (picked.size > 2 * 1024 * 1024) {
      setErrors(p => ({ ...p, file: 'File must be under 2 MB.' })); return;
    }
    setFile(picked);
    setErrors(p => ({ ...p, file: '' }));
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(picked);
  }, []);

  const removeFile = useCallback(() => {
    setFile(null); setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())                    e.name = 'Required';
    if (!form.parentsName.trim())             e.parentsName = 'Required';
    if (!form.religion.trim())                e.religion = 'Required';
    if (!form.caste.trim())                   e.caste = 'Required';
    if (!form.maritalStatus)                  e.maritalStatus = 'Required';
    if (!form.educationQualifications.trim()) e.educationQualifications = 'Required';
    if (!form.residenceAddress.trim())        e.residenceAddress = 'Required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); setServerMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('paymentScreenshot', file);
    try {
      const { data } = await api.post('/api/submit-form', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      setServerMsg(
        data.paymentStatus === 'Paid'
          ? `Thank you! Your payment of ₹${data.extractedAmount} has been verified.`
          : data.paymentStatus === 'Pending'
          ? `Form submitted. Payment ₹${data.extractedAmount} is less than required.`
          : data.paymentStatus === 'Invalid Screenshot'
          ? 'Form submitted. Could not read payment amount from screenshot.'
          : 'Form submitted. No payment screenshot uploaded.'
      );
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  /* ── Success Screen ─────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Submitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">{serverMsg}</p>
          <button
            onClick={() => { setSubmitted(false); setForm(INITIAL); setFile(null); setPreview(null); }}
            className="btn-primary w-full">
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 sm:py-8 px-3 sm:px-4">

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold leading-tight">TELANGANA COMMERCIAL TAXES</h1>
              <p className="text-blue-200 text-xs font-medium">S.C./S.T. EMPLOYEES ASSOCIATION</p>
              <p className="text-blue-100 text-xs mt-0.5">Member Registration Form</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>

          {/* Personal Details */}
          <SectionHeader icon="👤" title="Personal Details" />
          <div className="px-3 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <F label="Full Name" required error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="Enter your full name"
                className={`field-input ${errors.name ? 'field-input-error' : ''}`} />
            </F>
            <F label="Parent's Name" required error={errors.parentsName}>
              <input type="text" name="parentsName" value={form.parentsName} onChange={handleChange}
                placeholder="Father's / Mother's name"
                className={`field-input ${errors.parentsName ? 'field-input-error' : ''}`} />
            </F>
            <F label="Religion" required error={errors.religion}>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                placeholder="e.g., Hindu, Muslim"
                className={`field-input ${errors.religion ? 'field-input-error' : ''}`} />
            </F>
            <F label="Caste" required error={errors.caste}>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                placeholder="Enter your caste"
                className={`field-input ${errors.caste ? 'field-input-error' : ''}`} />
            </F>
            <F label="Marital Status" required error={errors.maritalStatus} full>
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange}
                className={`field-input ${errors.maritalStatus ? 'field-input-error' : ''}`}>
                <option value="">-- Select --</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            </F>
          </div>

          {/* Working Place */}
          <SectionHeader icon="🏢" title="Working Place" />
          <div className="px-3 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <F label="Designation">
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g., Deputy Commissioner" className="field-input" />
            </F>
            <F label="Division">
              <input type="text" name="division" value={form.division} onChange={handleChange}
                placeholder="Division name" className="field-input" />
            </F>
            <F label="Circle">
              <input type="text" name="circle" value={form.circle} onChange={handleChange}
                placeholder="Circle name" className="field-input" />
            </F>
          </div>

          {/* Qualifications & Address */}
          <SectionHeader icon="🎓" title="Qualifications & Address" />
          <div className="px-3 sm:px-6 py-4 grid grid-cols-1 gap-3 sm:gap-4">
            <F label="Education Qualifications" required error={errors.educationQualifications}>
              <input type="text" name="educationQualifications" value={form.educationQualifications}
                onChange={handleChange} placeholder="e.g., B.Com, B.Sc, M.A."
                className={`field-input ${errors.educationQualifications ? 'field-input-error' : ''}`} />
            </F>
            <F label="Residence Address" required error={errors.residenceAddress}>
              <textarea name="residenceAddress" value={form.residenceAddress} onChange={handleChange}
                rows={3} placeholder="Door No., Street, Area, District, PIN Code"
                className={`field-input resize-none ${errors.residenceAddress ? 'field-input-error' : ''}`} />
            </F>
            <F label="Interests / Hobbies">
              <input type="text" name="interests" value={form.interests} onChange={handleChange}
                placeholder="e.g., Reading, Cricket, Music" className="field-input" />
            </F>
          </div>

          {/* Payment Screenshot */}
          <SectionHeader icon="💳" title="Payment Screenshot" />
          <div className="px-3 sm:px-6 py-4">
            <p className="text-xs text-gray-500 mb-3">
              Upload membership payment screenshot — JPEG / PNG, max 2 MB.
              Expected: <strong className="text-blue-700">₹500</strong>
            </p>
            {!preview ? (
              <label htmlFor="fileInput"
                className="flex flex-col items-center justify-center w-full h-28 sm:h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <svg className="w-8 h-8 text-gray-400 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500 font-medium">Tap to upload</span>
                <span className="text-xs text-gray-400 mt-1">JPEG or PNG · max 2 MB</span>
                <input id="fileInput" ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png"
                  className="hidden" onChange={handleFile} />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={preview} alt="preview"
                  className="max-h-44 rounded-xl border border-gray-200 shadow-sm object-contain" />
                <button type="button" onClick={removeFile}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-gray-400 mt-1.5">{file?.name}</p>
              </div>
            )}
            {errors.file && <p className="field-error mt-2">{errors.file}</p>}
          </div>

          {/* Server error */}
          {serverMsg && !submitted && (
            <div className="mx-3 sm:mx-6 mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {serverMsg}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 sm:px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 self-start sm:self-auto">
              <span className="text-red-500">*</span> required fields
            </p>
            <button type="submit" disabled={submitting}
              className="btn-primary w-full sm:w-auto px-8">
              {submitting
                ? <><SpinnerIcon /> Submitting…</>
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg> Submit Form</>}
            </button>
          </div>

        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-5">
        TCTS S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function F({ label, required, error, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="field-label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-blue-50 border-t border-b border-blue-100">
      <span className="text-sm">{icon}</span>
      <h2 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
