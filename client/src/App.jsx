import { Routes, Route, Navigate } from 'react-router-dom';
import FormPage      from './pages/FormPage';
import AdminPage     from './pages/AdminPage';
import LoginPage     from './pages/LoginPage';
import ContactPage   from './pages/ContactPage';
import TermsPage     from './pages/TermsPage';
import RefundPage    from './pages/RefundPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<FormPage />} />
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms"   element={<TermsPage />} />
      <Route path="/refunds" element={<RefundPage />} />
      <Route path="/admin"   element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
