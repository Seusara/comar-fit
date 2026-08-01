import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../firebase/auth';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginUser(email, password);
      navigate('/');
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Iniciar sesión</h1>

        <label className="block" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />

        <label className="block" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

        {error && <p role="alert" className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Entrar
        </button>

        <p className="text-on-surface-variant text-sm">
          ¿No tienes cuenta? <Link to="/register" className="text-primary-fixed-dim">Regístrate</Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
