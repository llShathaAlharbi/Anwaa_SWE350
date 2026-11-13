import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { StarryBackground } from './components/StarryBackground';
import { Navbar } from './components/Navbar';
import { GuidedTour } from './components/GuidedTour';
import { DifyChatBubble } from './components/DifyChatBubble';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { TodayPage } from './pages/TodayPage';
import { ChatPage } from './pages/ChatPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AccountPage } from './pages/AccountPage';
import { GuestUpgradeModal } from './components/GuestUpgradeModal';

const AccountRoute: React.FC = () => {
  const { user } = useApp();
  if (user?.isAnonymous) {
    return <Navigate to="/" replace />;
  }
  return <AccountPage />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady } = useApp();
  const location = useLocation();

  if (!authReady) {
    return (
      <div
        className="min-h-screen text-[var(--ink)] flex items-center justify-center"
        dir="rtl"
        lang="ar"
      >
        <div className="text-center space-y-2">
          <div
            className="text-3xl font-bold text-[var(--sky-gold)]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            أنواء
          </div>
          <div className="text-xs text-[var(--sky-muted)]">جارٍ التحقق من الجلسة…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen text-[var(--ink)] flex flex-col" dir="rtl" lang="ar">
      <Navbar />
      <main className="flex-1">{children}</main>
      <GuidedTour />
      <GuestUpgradeModal />
      <DifyChatBubble />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <div className="min-h-screen text-[var(--ink)]">
        {/* Fixed full-viewport starry background canvas mounted once at root */}
        <StarryBackground />

        {/* App content sits above it (position: relative; z-index: 1) */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/today"
                element={
                  <ProtectedRoute>
                    <TodayPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <SuggestionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suggestions"
                element={
                  <ProtectedRoute>
                    <SuggestionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountRoute />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
