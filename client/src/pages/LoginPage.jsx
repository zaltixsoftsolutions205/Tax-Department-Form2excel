import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
  const [mode,       setMode]       = useState('login'); // 'login' | 'register'
  const [name,       setName]       = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [msg,        setMsg]        = useState('');
  const navigate = useNavigate();

  const isRegister = mode === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        // Register → show success then switch to login
        await api.post('/api/auth/register', { name, identifier, password });
        setName(''); setPassword(''); setIdentifier('');
        setMode('login');
        setError('');
        setMsg('Registered successfully! Please log in.');
      } else {
        // Login → save token and go to admin
        const { data } = await api.post('/api/auth/login', { identifier, password });
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser',  JSON.stringify(data.admin));
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-4 text-white mb-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold">TCTS — Admin Panel</h1>
              <p className="text-blue-200 text-xs">Telangana Commercial Taxes S.C./S.T.</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setMode('login'); setError(''); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50/50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              Login
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50/50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">

            {/* Name — register only */}
            {isRegister && (
              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="field-input" required />
              </div>
            )}

            {/* Email or Mobile */}
            <div>
              <label className="field-label">Email / Mobile Number</label>
              <input
                type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder="email@example.com or 9876543210"
                className="field-input" required />
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isRegister ? 'Min. 6 characters' : 'Enter password'}
                  className="field-input pr-10" required />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                  }
                </button>
              </div>
            </div>

            {/* Success message (after register) */}
            {msg && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs text-green-700">{msg}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? <><Spinner /> {isRegister ? 'Registering…' : 'Logging in…'}</>
                : isRegister ? 'Create Account' : 'Login to Admin Panel'
              }
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          TCTS S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
