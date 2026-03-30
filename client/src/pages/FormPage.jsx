import { useState, useRef, useCallback } from 'react';
import api from '../api';

const AMOUNT = 1000;

const INITIAL = {
  name: '', parentsName: '', mobile: '', maritalStatus: '',
  designation: '', division: '', circle: '',
  educationQualifications: '', residenceAddress: '', interests: '',
  religion: '', caste: '',
};

export default function FormPage() {
  const [form,           setForm]           = useState(INITIAL);
  const [file,           setFile]           = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [passport,       setPassport]       = useState(null);
  const [passportPreview,setPassportPreview]= useState(null);
  const [errors,         setErrors]         = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [serverMsg,      setServerMsg]      = useState('');
  const fileRef     = useRef(null);
  const passportRef = useRef(null);

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
    setErrors(p => ({ ...p, file: '' }));
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else        { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          setFile(new File([blob], f.name, { type: 'image/jpeg' }));
          setPreview(canvas.toDataURL('image/jpeg', 0.7));
        }, 'image/jpeg', 0.7);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }, []);

  const removeFile = () => {
    setFile(null); setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePassport = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setErrors(p => ({ ...p, passport: 'Only JPEG / PNG allowed.' })); return;
    }
    setErrors(p => ({ ...p, passport: '' }));
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 375; // passport ratio 4:5
        canvas.getContext('2d').drawImage(img, 0, 0, 300, 375);
        canvas.toBlob(blob => {
          setPassport(new File([blob], f.name, { type: 'image/jpeg' }));
          setPassportPreview(canvas.toDataURL('image/jpeg', 0.85));
        }, 'image/jpeg', 0.85);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }, []);

  const removePassport = () => {
    setPassport(null); setPassportPreview(null);
    if (passportRef.current) passportRef.current.value = '';
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
    if (!passport)                             e.passport = 'Passport size photo is required.';
    if (!file)                                e.file = 'Payment screenshot is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); setServerMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('passportPhoto', passport);
    fd.append('paymentScreenshot', file);
    try {
      const { data } = await api.post('/api/submit-form', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      setServerMsg(
        data.paymentStatus === 'Paid'
          ? 'Payment of ₹1000 verified! Welcome to the Association.'
          : data.paymentStatus === 'Invalid Screenshot'
          ? 'Screenshot could not be verified. Admin will review your payment.'
          : 'Form submitted. Admin will verify your payment shortly.'
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
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{serverMsg}</p>
          <button onClick={() => { setSubmitted(false); setForm(INITIAL); setFile(null); setPreview(null); setPassport(null); setPassportPreview(null); }}
            className="btn-primary w-full">Submit Another Response</button>
        </div>
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-3 md:px-4">

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-4 md:mb-6 rounded-xl overflow-hidden shadow-lg border border-gray-200">

        {/* Blue top section */}
        <div style={{ backgroundColor: '#3264C8' }} className="text-white">
          {/* Tagline row */}
          <div className="flex justify-between items-center px-3 md:px-5 pt-2 pb-1 text-[10px] md:text-xs font-bold italic text-white">
            <span>Educate !</span>
            <span>Organise !!</span>
            <span>Agitate !!!</span>
          </div>

          {/* Logo + Title */}
          <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 pb-3">
            {/* Dr. Ambedkar photo */}
            <div className="w-12 h-12 md:w-20 md:h-20 rounded-full flex-shrink-0 border-2 border-white overflow-hidden">
              <img src="/ambedkar.jpg" alt="Dr. B.R. Ambedkar" className="w-full h-full object-cover object-top" />
            </div>

            {/* Title text */}
            <div className="flex-1 text-center" style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(0.9rem, 4.5vw, 2.2rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#CC0000', textShadow: '-1px 0 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}>
                Telangana Commercial Taxes
              </h1>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(0.82rem, 4vw, 2rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#CC0000', textShadow: '-1px 0 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}>
                S.C./S.T. Employees Association
              </h2>
              <p className="font-bold text-[10px] md:text-sm mt-1" style={{ color: '#1a1a6e' }}>HYDERABAD</p>
              <p className="text-[9px] md:text-xs" style={{ color: '#1a1a6e' }}>( Regd.No. 5045/1994 )</p>
            </div>
          </div>
        </div>

        {/* Office bearers row */}
        <div className="bg-white border-t border-gray-300 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
          {[
            { role: 'President',           name: 'K. BHEEKYA NAIK',  phone: '9440517955' },
            { role: 'Associate President', name: 'M. VIJAY KUMAR',   phone: '7396102255' },
            { role: 'Treasurer',           name: 'A. ANAND KUMAR',   phone: '9398774991' },
            { role: 'General Secretary',   name: 'K. NAGENDER',      phone: '8790071900' },
          ].map(({ role, name, phone }) => (
            <div key={role} className="text-center py-2 px-1">
              <p className="text-[9px] md:text-xs text-gray-700">{role} :</p>
              <p className="text-[11px] md:text-sm font-bold leading-tight" style={{ color: '#CC0000' }}>{name}</p>
              <p className="text-[9px] md:text-xs text-gray-700">{phone}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
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

          {/* Passport Size Photo */}
          <SectionHeader icon="🪪" title="Passport Size Photo" />
          <div className="px-3 md:px-6 py-3 md:py-5">
            <p className="text-xs text-gray-500 mb-3">
              Upload a recent <strong>passport size photo</strong> (face clearly visible). JPEG or PNG only.
            </p>
            {!passportPreview ? (
              <label htmlFor="passportInput"
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                  ${errors.passport ? 'border-red-400 bg-red-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 bg-blue-50/30'}`}>
                <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-semibold text-blue-600">Tap to upload passport photo</span>
                <span className="text-xs text-gray-400 mt-1">JPEG or PNG • will be cropped to passport size</span>
                <input id="passportInput" ref={passportRef} type="file" accept="image/jpeg,image/jpg,image/png"
                  className="hidden" onChange={handlePassport} />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={passportPreview} alt="passport preview"
                  className="h-40 w-32 rounded-lg border-2 border-green-300 shadow-sm object-cover" />
                <button type="button" onClick={removePassport}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-green-600 font-medium mt-2">✓ Passport photo uploaded</p>
              </div>
            )}
            {errors.passport && <p className="field-error mt-2">{errors.passport}</p>}
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
            <F label="Residence Address" error={errors.residenceAddress}>
              <textarea name="residenceAddress" value={form.residenceAddress} onChange={handleChange}
                rows={3} placeholder="Door No., Street, Area, District, PIN Code"
                className={`field-input resize-none`} />
            </F>
            <F label="Interests / Hobbies">
              <input type="text" name="interests" value={form.interests} onChange={handleChange}
                placeholder="e.g., Reading, Cricket, Music" className="field-input" />
            </F>
          </div>

          {/* Payment Screenshot */}
          <SectionHeader icon="💳" title="Payment Screenshot" />
          <div className="px-3 md:px-6 py-3 md:py-5">
            <p className="text-xs text-gray-500 mb-3">
              Pay <strong className="text-blue-700">₹{AMOUNT}</strong> and upload the payment screenshot. The system will automatically verify your payment.
            </p>
            {!preview ? (
              <label htmlFor="fileInput"
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                  ${errors.file ? 'border-red-400 bg-red-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 bg-blue-50/30'}`}>
                <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-blue-600">Tap to upload payment screenshot</span>
                <span className="text-xs text-gray-400 mt-1">JPEG or PNG</span>
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

          {serverMsg && !submitted && (
            <div className="mx-3 md:mx-6 mb-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {serverMsg}
            </div>
          )}

          <div className="px-3 md:px-6 py-3 md:py-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory.</p>
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

function Spin() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
