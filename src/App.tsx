import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth, Role } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ConfigStatus from './components/common/ConfigStatus';
import StudentPortal from './pages/StudentPortal';
import HeadPortal from './pages/HeadPortal';
import AdminPortal from './pages/AdminPortal';
import AuthPage from './pages/AuthPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import Loader from './components/common/Loader';
import RoleSelectionWrapper from './components/common/RoleSelectionWrapper';


import { ChatProvider } from './contexts/ChatContext';
import ChatWidget from './components/chat/ChatWidget';
import { ChapterHeadProvider } from './contexts/ChapterHeadContext';

// This component will wrap pages that need the Header and Footer
const MainLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
    <header>
      <Header />
    </header>
    <main className="flex-1 bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Outlet /> {/* Child routes will render here */}
    </main>
    <ChatWidget />
    <footer>
      <Footer />
    </footer>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: Role[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }
  
  // If user has multiple roles but hasn't selected one, redirect to selection
  // But only if they're accessing the root paths - the role toggle allows switching on the fly
  if (user.groups.length > 1 && !user.activeRole && window.location.pathname === '/') {
    return <Navigate to="/select-role" replace />;
  }

  // If no active role is set, but user has roles, try to set a default
  if (!user.activeRole && user.groups.length > 0) {
    // This will be handled by the role selection or role toggle
    if (user.groups.length === 1) {
      // Auto-set single role
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/select-role" replace />;
  }

  if (!allowedRoles.includes(user.activeRole as Role)) {
    // Fallback logic if they try to access a page they aren't allowed on
    // Prioritize redirecting to their ACTIVE role's dashboard
    if (user.activeRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.activeRole === 'chapter-head') return <Navigate to="/head/dashboard" replace />;
    if (user.activeRole === 'student') return <Navigate to="/student/dashboard" replace />;
    
    // Last resort fallbacks if activeRole is somehow missing or invalid
    if (user.groups.includes('admin')) return <Navigate to="/admin/dashboard" replace />;
    if (user.groups.includes('chapter-head')) return <Navigate to="/head/dashboard" replace />;
    if (user.groups.includes('student')) return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/" replace />; 
  }

  return <>{children}</>;
};




function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <ChapterHeadProvider>
          <AppContent />
        </ChapterHeadProvider>
      </ChatProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const getRedirectPath = (user: { activeRole: string, groups: string[] } | null): string => {
      if (!user) return '/';
      
      // If user has multiple groups but no active role, send to selection page
      if (user.groups.length > 1 && !user.activeRole) {
          return '/select-role';
      }

      // Prioritize the active role
      const role = user.activeRole;
      if (role === 'student') return '/student/dashboard';
      if (role === 'chapter-head') return '/head/dashboard';
      if (role === 'admin') return '/admin/dashboard';

      // Fallback if activeRole is somehow invalid but they have groups
      if (user.groups.includes('admin')) return '/admin/dashboard';
      if (user.groups.includes('chapter-head')) return '/head/dashboard';
      if (user.groups.includes('student')) return '/student/dashboard';
      
      return '/';
  }

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  }

  return (
    <>
    <RoleSelectionWrapper>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated && user ? (
              <Navigate to={getRedirectPath(user)} replace />
            ) : (
              <AuthPage />
            )
          } 
        />
        
        <Route path="/google-callback" element={<OAuthCallbackPage />} />
        
        {/* The RoleSelectionWrapper handles the UI for /select-role implicitly when no activeRole exists */}
        <Route path="/select-role" element={<Navigate to="/" replace />} />

        <Route element={<MainLayout />}>
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/head/*"
            element={
              <ProtectedRoute allowedRoles={['chapter-head', 'admin']}>
                <HeadPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Add ConfigStatus for debugging in development */}
      {import.meta.env.DEV && <ConfigStatus />}
    </RoleSelectionWrapper>
    </>
  );
}

export default App;
