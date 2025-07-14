import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import StudentPortal from './pages/StudentPortal';
import AdminPortal from './pages/AdminPortal';
import Loader from './components/common/Loader';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'student' | 'admin' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />
              ) : (
                <LoginForm />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? (
                <Navigate to="/student" replace />
              ) : (
                <RegisterForm />
              )
            } 
          />
          <Route 
            path="/student/*" 
            element={
              <ProtectedRoute requiredRole="student">
                <StudentPortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPortal />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;