import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NetworkStatus from './components/NetworkStatus';
import PageSkeleton from './components/PageSkeleton';
import { routeLoaders } from './routes/prefetch';

// Route-based code splitting: each page becomes its own chunk, downloaded
// only when the user actually navigates there, instead of one ~720kB bundle
// shipped up front. Login/Register are the two entry points nearly every
// session hits first, so keeping those eagerly bundled avoids an extra
// network round-trip before the user can even sign in; everything reachable
// only after auth is lazy.
import Login from './pages/Login';
import Register from './pages/Register';

const ConnectPartner = lazy(routeLoaders.connectPartner);
const Dashboard = lazy(routeLoaders.dashboard);
const SubirPrueba = lazy(routeLoaders.subirPrueba);
const RevisarPrueba = lazy(routeLoaders.revisarPrueba);
const Home = lazy(routeLoaders.home);
const Perfil = lazy(routeLoaders.perfil);
const Rutina = lazy(routeLoaders.rutina);
const Duelo = lazy(routeLoaders.duelo);

function RouteFallback() {
  return <PageSkeleton />;
}

function RequireAuth({ children }) {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <PageSkeleton />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NetworkStatus />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/connect-partner"
            element={
              <RequireAuth>
                <ConnectPartner />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/rutina"
            element={
              <RequireAuth>
                <Rutina />
              </RequireAuth>
            }
          />
          <Route
            path="/duelo"
            element={
              <RequireAuth>
                <Duelo />
              </RequireAuth>
            }
          />
          <Route
            path="/subir-prueba"
            element={
              <RequireAuth>
                <SubirPrueba />
              </RequireAuth>
            }
          />
          <Route
            path="/revisar-prueba"
            element={
              <RequireAuth>
                <RevisarPrueba />
              </RequireAuth>
            }
          />
          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <Perfil />
              </RequireAuth>
            }
          />
          <Route
            path="/workouts/:workoutId/edit"
            element={
              <RequireAuth>
                <SubirPrueba />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
