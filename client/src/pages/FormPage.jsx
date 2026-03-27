import { useState, useRef, useCallback } from 'react';
import api from '../api';

const ACCOUNT_NAME = 'Commercial Taxes SC and ST Employees Association';
const ACCOUNT_NO   = '925010044679607';
const BANK_NAME    = 'Union Bank of India';
const IFSC         = 'UBIN080817';
const BRANCH       = 'Kalakada';
const AMOUNT       = 1000;

const INITIAL = {
  name: '', parentsName: '', mobile: '', maritalStatus: '',
  designation: '', division: '', circle: '',
  educationQualifications: '', residenceAddress: '', interests: '',
  religion: '', caste: '',
};

export default function FormPage() {
  const [form,             setForm]             = useState(INITIAL);
  const [file,             setFile]             = useState(null);
  const [preview,          setPreview]          = useState(null);
  const [errors,           setErrors]           = useState({});
  const [submitting,       setSubmitting]       = useState(false);
  const [submitted,        setSubmitted]        = useState(false);
  const [serverMsg,        setServerMsg]        = useState('');
  const fileRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  }, []);

  const handleFile = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setErrors(p => ({ ...p, file: 'Only JPEG / PNG allowed.' })); return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setErrors(p => ({ ...p, file: 'Max file size is 2 MB.' })); return;
    }
    setFile(f); setErrors(p => ({ ...p, file: '' }));
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result);
    r.readAsDataURL(f);
  }, []);

  const removeFile = () => {
    setFile(null); setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };


  const validate = () => {
    const e = {};
    if (!form.name.trim())                    e.name = 'Required';
    if (!form.parentsName.trim())             e.parentsName = 'Required';
    if (!form.mobile.trim())                  e.mobile = 'Required';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!form.maritalStatus)                  e.maritalStatus = 'Required';
    if (!form.designation.trim())             e.designation = 'Required';
    if (!form.division.trim())                e.division = 'Required';
    if (!form.circle.trim())                  e.circle = 'Required';
    if (!form.educationQualifications.trim()) e.educationQualifications = 'Required';
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
          ? 'Form submitted! Payment verified successfully. Welcome to the association!'
          : 'Form submitted. Please ensure you have paid ₹500 to the bank account. Admin will verify and update your status.'
      );
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  /* ── Success ─────────────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{serverMsg}</p>
          <button onClick={() => { setSubmitted(false); setForm(INITIAL); setFile(null); setPreview(null); }}
            className="btn-primary w-full">Submit Another Response</button>
        </div>
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-3 md:px-4">

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-4 md:mb-6">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold leading-tight">TELANGANA COMMERCIAL TAXES</h1>
              <p className="text-blue-200 text-xs md:text-sm font-medium mt-0.5">S.C./S.T. EMPLOYEES ASSOCIATION</p>
              <p className="text-blue-100 text-xs mt-0.5 hidden md:block">Member Registration Form</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>

          {/* Personal Details */}
          <SectionHeader icon="👤" title="Personal Details" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
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
            <F label="Mobile Number" required error={errors.mobile}>
              <input type="tel" name="mobile" value={form.mobile} onChange={handleChange}
                placeholder="10-digit mobile number" maxLength={10}
                className={`field-input ${errors.mobile ? 'field-input-error' : ''}`} />
            </F>
            <F label="Marital Status" required error={errors.maritalStatus}>
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange}
                className={`field-input ${errors.maritalStatus ? 'field-input-error' : ''}`}>
                <option value="">-- Select --</option>
                <option>Married</option>
                <option>Unmarried</option>
              </select>
            </F>
            <F label="Religion" error={errors.religion}>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                placeholder="e.g., Hindu, Muslim, Christian" className="field-input" />
            </F>
            <F label="Caste" error={errors.caste}>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                placeholder="Enter your caste" className="field-input" />
            </F>
          </div>

          {/* Working Place */}
          <SectionHeader icon="🏢" title="Working Place" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            <F label="Designation" required error={errors.designation}>
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g., Deputy Commissioner"
                className={`field-input ${errors.designation ? 'field-input-error' : ''}`} />
            </F>
            <F label="Division" required error={errors.division}>
              <input type="text" name="division" value={form.division} onChange={handleChange}
                placeholder="Division name"
                className={`field-input ${errors.division ? 'field-input-error' : ''}`} />
            </F>
            <F label="Circle" required error={errors.circle}>
              <input type="text" name="circle" value={form.circle} onChange={handleChange}
                placeholder="Circle name"
                className={`field-input ${errors.circle ? 'field-input-error' : ''}`} />
            </F>
          </div>

          {/* Qualifications & Address */}
          <SectionHeader icon="🎓" title="Qualifications & Address" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 gap-3 md:gap-5">
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

          {/* Payment */}
          <SectionHeader icon="💳" title="Payment" />
          <div className="px-3 md:px-6 py-3 md:py-5 space-y-4">

            {/* Bank account details */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                <p className="text-sm font-semibold text-gray-800">Pay Membership Fee</p>
                <p className="text-xl font-bold text-blue-700">₹{AMOUNT}</p>
              </div>
              <div className="divide-y divide-blue-100">
                <AccountRow label="Account Holder" value={ACCOUNT_NAME} />
                <AccountRow label="Account Number" value={ACCOUNT_NO} copyable />
                <AccountRow label="Bank"           value={BANK_NAME} />
                <AccountRow label="IFSC Code"      value={IFSC} copyable />
                <AccountRow label="Branch"         value={BRANCH} />
              </div>
              <div className="px-4 py-2.5 bg-blue-100/50">
                <p className="text-xs text-blue-700">
                  Open PhonePe / GPay → <strong>Bank Transfer</strong> → enter above details → pay <strong>₹{AMOUNT}</strong>
                </p>
              </div>
            </div>

            {/* Screenshot upload — required for auto status */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Payment Screenshot <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-500 mb-3">
                After paying, take a screenshot and upload it here. The system will automatically verify your payment.
              </p>
              {!preview ? (
                <label htmlFor="fileInput"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-blue-50/30">
                  <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-600">Tap to upload payment screenshot</span>
                  <span className="text-xs text-gray-400 mt-1">JPEG or PNG · max 2 MB</span>
                  <input id="fileInput" ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png"
                    className="hidden" onChange={handleFile} />
                </label>
              ) : (
                <div className="relative inline-block max-w-full">
                  <img src={preview} alt="preview"
                    className="max-h-52 w-auto rounded-xl border-2 border-green-300 shadow-sm object-contain" />
                  <button type="button" onClick={removeFile}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-xs text-green-600 font-medium mt-2">✓ Screenshot uploaded</p>
                </div>
              )}
              {errors.file && <p className="field-error mt-2">{errors.file}</p>}
            </div>
          </div>

          {serverMsg && !submitted && (
            <div className="mx-3 md:mx-6 mb-2 px-3 md:px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs md:text-sm text-red-700">
              {serverMsg}
            </div>
          )}

          <div className="px-3 md:px-6 py-3 md:py-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory.
            </p>
            <button type="submit" disabled={submitting} className="btn-primary w-full md:w-auto md:px-10">
              {submitting ? <><Spin /> Submitting…</> : <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Form
              </>}
            </button>
          </div>

        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 md:mt-6">
        Telangana Commercial Taxes S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 bg-blue-50 border-t border-b border-blue-100">
      <span className="text-sm md:text-base">{icon}</span>
      <h2 className="text-xs md:text-sm font-semibold text-blue-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function F({ label, required, error, children, className = '' }) {
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

function AccountRow({ label, value, copyable, copyValue }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
      </div>
      {copyable && <CopyButton text={copyValue ?? value} />}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg flex-shrink-0 font-medium">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function Spin() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
