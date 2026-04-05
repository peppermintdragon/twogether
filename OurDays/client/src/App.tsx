import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { SocketProvider } from './contexts/SocketContext';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MemoriesPage from './pages/MemoriesPage';
import MemoryDetailPage from './pages/MemoryDetailPage';
import AlbumsPage from './pages/AlbumsPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import DailyNotesPage from './pages/DailyNotesPage';
import MoodPage from './pages/MoodPage';
import SpecialDatesPage from './pages/SpecialDatesPage';
import BucketListPage from './pages/BucketListPage';
import CoupleProfilePage from './pages/CoupleProfilePage';
import LongDistancePage from './pages/LongDistancePage';
import SettingsPage from './pages/SettingsPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (user && user.onboardingCompleted) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
          <Route path="/reset-password" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />
        </Route>

        {/* Onboarding */}
        <Route path="/onboarding" element={
          user ? <OnboardingPage /> : <Navigate to="/login" replace />
        } />

        {/* Accept invite (can be accessed without auth) */}
        <Route path="/invite/:code" element={<AcceptInvitePage />} />

        {/* Protected app routes */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/memories/:id" element={<MemoryDetailPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:id" element={<AlbumDetailPage />} />
          <Route path="/notes" element={<DailyNotesPage />} />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/dates" element={<SpecialDatesPage />} />
          <Route path="/bucket-list" element={<BucketListPage />} />
          <Route path="/profile" element={<CoupleProfilePage />} />
          <Route path="/long-distance" element={<LongDistancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SocketProvider>
  );
}
