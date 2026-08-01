import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { registerUser } from '../firebase/auth';
import { createUserDocument } from '../firebase/firestore';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

const initialForm = {
  displayName: '',
  email: '',
  password: '',
  gender: 'M',
  age: '',
  weight: '',
  height: '',
  experienceLevel: 'Beginner',
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    // Normalize once so the Auth account and the stored user document agree,
    // and so partner lookup by email always matches.
    const normalizedEmail = form.email.trim().toLowerCase();

    let credential;
    try {
      credential = await registerUser(normalizedEmail, form.password);
    } catch (err) {
      setError('No pudimos crear tu cuenta. Verifica tus datos e intenta de nuevo.');
      setSubmitting(false);
      return;
    }

    try {
      await createUserDocument(credential.user.uid, {
        email: normalizedEmail,
        displayName: form.displayName,
        gender: form.gender,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        experienceLevel: form.experienceLevel,
      });
      navigate('/connect-partner');
    } catch (err) {
      // Roll back the just-created auth account, otherwise the user is left
      // with an account that has no profile document and no way to recover.
      await deleteUser(credential.user).catch(() => {});
      setError('No pudimos crear tu cuenta. Verifica tus datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Crear tu cuenta</h1>

        <label className="block" htmlFor="displayName">Nombre completo</label>
        <input id="displayName" name="displayName" type="text" required value={form.displayName} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="gender">Género</label>
        <select id="gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>

        <label className="block" htmlFor="age">Edad</label>
        <input id="age" name="age" type="number" required min={1} value={form.age} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="weight">Peso (kg)</label>
        <input id="weight" name="weight" type="number" required min={1} value={form.weight} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="height">Altura (cm)</label>
        <input id="height" name="height" type="number" required min={1} value={form.height} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="experienceLevel">Nivel de experiencia</label>
        <select id="experienceLevel" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className={inputClass}>
          <option value="Beginner">Principiante</option>
          <option value="Intermediate">Intermedio</option>
          <option value="Advanced">Avanzado</option>
        </select>

        {error && <p role="alert" className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Crear cuenta
        </button>

        <p className="text-on-surface-variant text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary-fixed-dim">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
