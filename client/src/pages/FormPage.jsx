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
    if (!form.name.trim())                    e.name = 'Name is required.';
    if (!form.parentsName.trim())             e.parentsName = "Parent's name is required.";
    if (!form.religion.trim())                e.religion = 'Religion is required.';
    if (!form.caste.trim())                   e.caste = 'Caste is required.';
    if (!form.maritalStatus)                  e.maritalStatus = 'Please select marital status.';
    if (!form.educationQualifications.trim()) e.educationQualifications = 'Education qualifications are required.';
    if (!form.residenceAddress.trim())        e.residenceAddress = 'Residence address is required.';
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
          ? `Form submitted. Payment amount ₹${data.extractedAmount} seems less than required.`
          : data.paymentStatus === 'Invalid Screenshot'
          ? 'Form submitted. We could not read the payment amount from your screenshot.'
          : 'Form submitted. No payment screenshot uploaded.'
      );
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{serverMsg}</p>
          <button
            onClick={() => { setSubmitted(false); setForm(INITIAL); setFile(null); setPreview(null); }}
            className="btn-primary w-full"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 sm:py-8 px-3 sm:px-4">

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold leading-tight">TELANGANA COMMERCIAL TAXES</h1>
              <p className="text-blue-200 text-xs sm:text-sm font-medium mt-0.5">S.C./S.T. EMPLOYEES ASSOCIATION</p>
              <p className="text-blue-100 text-xs mt-0.5">Member Registration Form</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="max-w-2xl mx-auto bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>

          <SectionHeader icon="👤" title="Personal Details" />
          <div className="px-3 sm:px-6 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            <Field label="Full Name" required error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="Enter your full name"
                className={`field-input ${errors.name ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Parent's Name" required error={errors.parentsName}>
              <input type="text" name="parentsName" value={form.parentsName} onChange={handleChange}
                placeholder="Father's / Mother's name"
                className={`field-input ${errors.parentsName ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Religion" required error={errors.religion}>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                placeholder="e.g., Hindu, Muslim, Christian"
                className={`field-input ${errors.religion ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Caste" required error={errors.caste}>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                placeholder="Enter your caste"
                className={`field-input ${errors.caste ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Marital Status" required error={errors.maritalStatus} className="sm:col-span-2">
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange}
                className={`field-input ${errors.maritalStatus ? 'field-input-error' : ''}`}>
                <option value="">-- Select --</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            </Field>
          </div>

          <SectionHeader icon="🏢" title="Working Place" />
          <div className="px-3 sm:px-6 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            <Field label="Designation">
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g., Deputy Commissioner" className="field-input" />
            </Field>
            <Field label="Division">
              <input type="text" name="division" value={form.division} onChange={handleChange}
                placeholder="Division name" className="field-input" />
            </Field>
            <Field label="Circle">
              <input type="text" name="circle" value={form.circle} onChange={handleChange}
                placeholder="Circle name" className="field-input" />
            </Field>
          </div>

          <SectionHeader icon="🎓" title="Qualifications & Address" />
          <div className="px-3 sm:px-6 py-4 sm:py-5 grid grid-cols-1 gap-3 sm:gap-5">
            <Field label="Education Qualifications" required error={errors.educationQualifications}>
              <input type="text" name="educationQualifications" value={form.educationQualifications}
                onChange={handleChange} placeholder="e.g., B.Com, B.Sc, M.A., etc."
                className={`field-input ${errors.educationQualifications ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Residence Address" required error={errors.residenceAddress}>
              <textarea name="residenceAddress" value={form.residenceAddress} onChange={handleChange}
                rows={3} placeholder="Door No., Street, Area, District, PIN Code"
                className={`field-input resize-none ${errors.residenceAddress ? 'field-input-error' : ''}`} />
            </Field>
            <Field label="Interests / Hobbies">
              <input type="text" name="interests" value={form.interests} onChange={handleChange}
                placeholder="e.g., Reading, Cricket, Music" className="field-input" />
            </Field>
          </div>

          <SectionHeader icon="💳" title="Payment Screenshot" />
          <div className="px-3 sm:px-6 py-4 sm:py-5">
            <p className="text-xs sm:text-sm text-gray-500 mb-3">
              Upload your membership payment screenshot (JPEG / PNG, max 2 MB).
              Expected amount: <strong className="text-blue-700">₹500</strong>
            </p>
            {!preview ? (
              <label htmlFor="fileInput"
                className="flex flex-col items-center justify-center w-full h-28 sm:h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors duration-150">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500 font-medium">Click to upload screenshot</span>
                <span className="text-xs text-gray-400 mt-1">JPEG or PNG · max 2 MB</span>
                <input id="fileInput" ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png"
                  className="hidden" onChange={handleFile} />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={preview} alt="Payment screenshot preview"
                  className="max-h-44 sm:max-h-52 rounded-xl border border-gray-200 shadow-sm object-contain" />
                <button type="button" onClick={removeFile}
                  className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700 transition-colors">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-gray-500 mt-2">{file?.name}</p>
              </div>
            )}
            {errors.file && <p className="field-error mt-2">{errors.file}</p>}
          </div>

          {serverMsg && !submitted && (
            <div className="mx-3 sm:mx-6 mb-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
              {serverMsg}
            </div>
          )}

          <div className="px-3 sm:px-6 py-4 sm:py-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory.
            </p>
            <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto px-8 sm:px-10">
              {submitting ? <><SpinnerIcon /> Submitting…</> : <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Form
              </>}
            </button>
          </div>

        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 sm:mt-6">
        Telangana Commercial Taxes S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

function Field({ label, required, error, children, className = '' }) {
  return (
    <div className={className}>
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
    <div className="flex items-center gap-2 px-3 sm:px-6 py-2.5 bg-blue-50 border-t border-b border-blue-100">
      <span className="text-sm sm:text-base">{icon}</span>
      <h2 className="text-xs sm:text-sm font-semibold text-blue-800 uppercase tracking-wide">{title}</h2>
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
