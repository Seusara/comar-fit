import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findUserByEmail, createDuel } from '../firebase/firestore';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

function ConnectPartner() {
  const { currentUser } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (partnerEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setError('No puedes conectarte contigo mismo.');
      return;
    }

    setSubmitting(true);
    try {
      const partner = await findUserByEmail(partnerEmail.trim());
      if (!partner) {
        setError('No encontramos ese email. Asegúrate de que tu pareja ya se registró.');
        return;
      }
      await createDuel(currentUser.uid, partner.uid);
      navigate('/dashboard');
    } catch (err) {
      setError('No pudimos conectar con tu pareja. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Conecta con tu pareja</h1>
        <p className="text-on-surface-variant text-sm">
          Ingresa el email con el que tu pareja ya se registró para iniciar el duelo.
        </p>

        <label className="block" htmlFor="partnerEmail">Email de tu pareja</label>
        <input
          id="partnerEmail"
          name="partnerEmail"
          type="email"
          required
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
          className={inputClass}
        />

        {error && <p role="alert" className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Conectar
        </button>
      </form>
    </main>
  );
}

export default ConnectPartner;
