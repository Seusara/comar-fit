import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../firebase/auth';
import FluidOrb from '../components/FluidOrb';

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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-20 -left-20 opacity-30 pointer-events-none">
        <FluidOrb size={300} color="#00dbe9" />
      </div>
      <div className="absolute -bottom-16 -right-16 opacity-20 pointer-events-none">
        <FluidOrb size={250} color="#ad00fe" />
      </div>

      {/* Logo orb */}
      <div className="mb-6 relative z-10">
        <FluidOrb size={100} color="#00dbe9" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6 relative z-10">
        <h1 className="font-headline-lg text-on-surface text-center">Iniciar sesión</h1>

        <label className="block text-on-surface-variant text-sm" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />

        <label className="block text-on-surface-variant text-sm" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

        {error && <p role="alert" className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Entrar
        </button>

        <p className="text-on-surface-variant text-sm text-center">
          ¿No tienes cuenta? <Link to="/register" className="text-primary-fixed-dim">Regístrate</Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
