import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ConnectPartner from './pages/ConnectPartner';
import Dashboard from './pages/Dashboard';
import SubirPrueba from './pages/SubirPrueba';
import RevisarPrueba from './pages/RevisarPrueba';
import Home from './pages/Home';
import Perfil from './pages/Perfil';
import Rutina from './pages/Rutina';
import Duelo from './pages/Duelo';

function RequireAuth({ children }) {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <p className="text-on-surface p-8">Cargando...</p>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
