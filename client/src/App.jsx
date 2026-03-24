import { Routes, Route, Navigate } from 'react-router-dom';
import FormPage      from './pages/FormPage';
import AdminPage     from './pages/AdminPage';
import LoginPage     from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<Navigate to="/form" replace />} />
      <Route path="/form"   element={<FormPage />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/admin"  element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/form" replace />} />
    </Routes>
  );
}
