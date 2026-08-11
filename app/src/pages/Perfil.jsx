import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { deriveParticipantActivity } from '../duel/activeDays';
import { updatePhysicalProfile, updateUserProfile } from '../firebase/firestore';
import { canUpdatePhysicalProfile, nextPhysicalProfileUpdateAt } from '../firebase/profilePolicy';
import { logoutUser } from '../firebase/auth';
import { uploadProfilePhoto } from '../cloudinary/uploadProfilePhoto';
import { processProfileImage, validateProfileImage } from '../profile/profileImage';
import { getStoredTheme, saveTheme, THEMES } from '../theme/themes';

const EMPTY_FORM = {
  displayName: '', age: '', height: '', experienceLevel: 'Beginner', objective: '',
  equipment: '', preferredWorkoutMinutes: '', usualWorkoutTime: '',
  notificationsEnabled: true, hideScreenshotLocation: true, gender: 'M', weight: '',
};

const EXPERIENCE_OPTIONS = [
  { value: 'Beginner', label: 'Principiante' },
  { value: 'Intermediate', label: 'Intermedio' },
  { value: 'Advanced', label: 'Avanzado' },
];

function profileToForm(profile) {
  if (!profile) return EMPTY_FORM;
  return {
    displayName: profile.displayName ?? '',
    age: profile.age ?? '',
    height: profile.height ?? '',
    experienceLevel: profile.experienceLevel ?? 'Beginner',
    objective: profile.objective ?? '',
    equipment: Array.isArray(profile.equipment) ? profile.equipment.join(', ') : '',
    preferredWorkoutMinutes: profile.preferredWorkoutMinutes ?? '',
    usualWorkoutTime: profile.usualWorkoutTime ?? '',
    notificationsEnabled: profile.notificationsEnabled ?? true,
    hideScreenshotLocation: profile.hideScreenshotLocation ?? true,
    gender: profile.gender ?? 'M',
    weight: profile.weight ?? '',
  };
}

function Stat({ value, label, icon }) {
  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant/10 p-4">
      <span className="material-symbols-outlined text-primary-fixed-dim" aria-hidden="true">{icon}</span>
      <p className="font-headline-lg text-xl mt-2">{value}</p>
      <p className="text-on-surface-variant text-xs mt-1">{label}</p>
    </div>
  );
}

function Preference({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block font-body-md text-sm">{label}</span>
        <span className="block text-on-surface-variant text-xs mt-1">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded text-secondary-fixed-dim focus:ring-primary-fixed-dim" />
    </label>
  );
}

function ThemeOption({ theme, selected, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Tema ${theme.label}`}
      onClick={() => onSelect(theme.id)}
      className={`relative min-h-[96px] rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim ${
        selected
          ? 'border-primary-fixed-dim bg-primary-fixed-dim/10'
          : 'border-outline-variant/30 bg-surface-container-low hover:border-primary-fixed-dim/60'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-label-md text-sm text-on-surface">{theme.label}</span>
        {selected && (
          <span className="material-symbols-outlined text-lg text-primary-fixed-dim" aria-hidden="true">
            check_circle
          </span>
        )}
      </span>
      <span className="mt-3 flex gap-1.5" aria-hidden="true">
        {theme.swatches.map((color) => (
          <span
            key={color}
            className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    </button>
  );
}

function Perfil() {
  const { currentUser } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refresh } = useUserProfile();
  const { duel, loading: duelLoading, error: duelError } = useActiveDuel();
  const { workouts, loading: workoutsLoading, error: workoutsError } = useWorkouts(duel?.duelId, currentUser?.uid);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [physicalSaving, setPhysicalSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => { setForm(profileToForm(profile)); }, [profile]);

  const stats = useMemo(() => {
    const uid = currentUser?.uid;
    const activity = deriveParticipantActivity(workouts, uid, duel);
    return {
      workouts: workouts?.length ?? 0,
      minutes: (workouts ?? []).reduce((total, workout) => total + (Number(workout.totalMinutes) || 0), 0),
      streak: activity.streak,
      activeDays: activity.activeDays,
    };
  }, [currentUser?.uid, duel, workouts]);

  const physicalEligible = canUpdatePhysicalProfile(profile);
  const physicalChanged = form.gender !== profile?.gender || Number(form.weight) !== Number(profile?.weight);
  const nextPhysicalDate = nextPhysicalProfileUpdateAt(profile);
  const loading = profileLoading || duelLoading || workoutsLoading;
  const loadError = profileError || duelError || workoutsError;

  function change(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function selectTheme(nextTheme) {
    setTheme(saveTheme(nextTheme));
  }

  async function saveGeneral(event) {
    event.preventDefault();
    setSaving(true); setMessage(''); setSaveError('');
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: form.displayName.trim(),
        age: Number(form.age),
        height: Number(form.height),
        experienceLevel: form.experienceLevel,
        objective: form.objective.trim(),
        equipment: form.equipment.split(',').map((item) => item.trim()).filter(Boolean),
        preferredWorkoutMinutes: Number(form.preferredWorkoutMinutes) || 0,
        usualWorkoutTime: form.usualWorkoutTime,
        notificationsEnabled: form.notificationsEnabled,
        hideScreenshotLocation: form.hideScreenshotLocation,
      });
      setMessage('Perfil actualizado');
      refresh();
    } catch {
      setSaveError('No pudimos guardar el perfil. Intenta nuevamente.');
    } finally { setSaving(false); }
  }

  async function savePhysical(event) {
    event.preventDefault();
    if (!physicalEligible || !physicalChanged) return;
    setPhysicalSaving(true); setMessage(''); setSaveError('');
    try {
      await updatePhysicalProfile(currentUser.uid, { gender: form.gender, weight: Number(form.weight) });
      setMessage('Datos físicos actualizados');
      refresh();
    } catch (error) {
      setSaveError(error?.message === 'PHYSICAL_PROFILE_LOCKED'
        ? 'Los datos físicos solo pueden cambiarse cada 30 días.'
        : 'No pudimos actualizar los datos físicos.');
    } finally { setPhysicalSaving(false); }
  }

  async function signOut() {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) await logoutUser();
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateProfileImage(file);
    setMessage('');
    setSaveError(error || '');
    setPhotoFile(error ? null : file);
  }

  async function savePhoto() {
    if (!photoFile || photoSaving) return;
    setPhotoSaving(true); setPhotoProgress(0); setMessage(''); setSaveError('');
    try {
      const blob = await processProfileImage(photoFile);
      const avatarUrl = await uploadProfilePhoto(currentUser.uid, blob, setPhotoProgress);
      await updateUserProfile(currentUser.uid, { avatarUrl });
      setPhotoFile(null);
      setMessage('Foto de perfil actualizada');
      refresh();
    } catch (error) {
      setSaveError(error?.message === 'CLOUDINARY_CONFIG_MISSING'
        ? 'La subida de fotos no está configurada. Contacta al administrador.'
        : error?.message === 'PROFILE_PHOTO_UPLOAD_TIMEOUT'
          ? 'La subida tardó demasiado. Revisa tu conexión e intenta nuevamente.'
          : 'No pudimos actualizar la foto. Intenta nuevamente.');
    } finally { setPhotoSaving(false); }
  }

  if (loading) return <Layout active="perfil"><p role="status" className="text-center p-8">Cargando perfil...</p></Layout>;
  if (loadError || !profile) return <Layout active="perfil"><p role="alert" className="text-error text-center p-8">No pudimos cargar tu perfil.</p></Layout>;

  return (
    <Layout active="perfil">
      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 action-gradient" />
          <div className="flex items-center gap-4">
            <Avatar name={profile.displayName} src={profile.avatarUrl} />
            <div>
              <p className="text-primary-fixed-dim text-xs uppercase tracking-widest">Perfil de atleta</p>
              <h1 className="font-headline-lg text-2xl mt-1">{profile.displayName}</h1>
              <p className="text-on-surface-variant text-sm">{profile.email ?? currentUser.email}</p>
              <p className="text-on-surface-variant text-xs mt-2">{form.objective || 'Define tu próximo objetivo'}</p>
              <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-bold text-primary-fixed-dim">
                <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
                Cambiar foto
                <input className="sr-only" type="file" accept="image/*" aria-label="Seleccionar foto de perfil" onChange={choosePhoto} />
              </label>
            </div>
          </div>
          {photoFile && (
            <div className="mt-4 rounded-xl bg-surface-container-low p-3">
              <p className="text-sm truncate">{photoFile.name}</p>
              {photoSaving && <p role="status" className="text-xs text-on-surface-variant mt-1">Subiendo foto: {photoProgress}%</p>}
              <Button type="button" className="w-full mt-3" disabled={photoSaving} onClick={savePhoto}>
                {photoSaving ? 'Guardando foto...' : 'Guardar foto'}
              </Button>
            </div>
          )}
        </Card>

        <section aria-labelledby="profile-stats-title">
          <h2 id="profile-stats-title" className="font-headline-lg text-lg mb-3">Tu rendimiento</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon="fitness_center" value={`${stats.workouts} entrenamientos`} label="Registrados" />
            <Stat icon="timer" value={`${stats.minutes} min`} label="Tiempo acumulado" />
            <Stat icon="local_fire_department" value={`${stats.streak} días`} label="Racha actual" />
            <Stat icon="calendar_month" value={`${stats.activeDays} de 7`} label="Días activos" />
          </div>
        </section>

        <section aria-labelledby="appearance-title">
          <Card>
            <div className="mb-4">
              <h2 id="appearance-title" className="font-headline-lg text-lg">Apariencia</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Elige cómo quieres ver Comar-Fit.</p>
            </div>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Seleccionar tema">
              {THEMES.map((option) => (
                <ThemeOption
                  key={option.id}
                  theme={option}
                  selected={theme === option.id}
                  onSelect={selectTheme}
                />
              ))}
            </div>
          </Card>
        </section>

        <form onSubmit={saveGeneral} className="space-y-4">
          <Card className="space-y-4">
            <h2 className="font-headline-lg text-lg">Perfil y entrenamiento</h2>
            <Input label="Nombre" name="displayName" required value={form.displayName} onChange={change} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Edad" name="age" type="number" min="1" required value={form.age} onChange={change} />
              <Input label="Altura (cm)" name="height" type="number" min="1" required value={form.height} onChange={change} />
            </div>
            <Select label="Nivel" name="experienceLevel" value={form.experienceLevel} onChange={change} options={EXPERIENCE_OPTIONS} />
            <Input label="Objetivo" name="objective" value={form.objective} onChange={change} placeholder="Ganar fuerza" />
            <Input label="Equipo disponible" name="equipment" value={form.equipment} onChange={change} placeholder="Mochila, bandas, mancuernas" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duración preferida (min)" name="preferredWorkoutMinutes" type="number" min="0" value={form.preferredWorkoutMinutes} onChange={change} />
              <Input label="Horario habitual" name="usualWorkoutTime" type="time" value={form.usualWorkoutTime} onChange={change} />
            </div>
          </Card>

          <Card>
            <h2 className="font-headline-lg text-lg mb-2">Privacidad y avisos</h2>
            <Preference label="Notificaciones" description="Recordatorios del duelo y tus entrenamientos" checked={form.notificationsEnabled} onChange={(event) => setForm((current) => ({ ...current, notificationsEnabled: event.target.checked }))} />
            <div className="border-t border-outline-variant/10" />
            <Preference label="Ocultar ubicación de capturas" description="Protege la ubicación al preparar futuras pruebas" checked={form.hideScreenshotLocation} onChange={(event) => setForm((current) => ({ ...current, hideScreenshotLocation: event.target.checked }))} />
          </Card>

          <Button type="submit" disabled={saving} className="w-full">{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
        </form>

        <form onSubmit={savePhysical}>
          <Card className="space-y-4">
            <div>
              <h2 className="font-headline-lg text-lg">Datos físicos</h2>
              <p className="text-on-surface-variant text-xs mt-1">Se pueden cambiar cada 30 días y solo afectan duelos futuros.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Género" name="gender" disabled={!physicalEligible} value={form.gender} onChange={change} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }]} />
              <Input label="Peso (kg)" name="weight" type="number" min="1" step="0.1" required disabled={!physicalEligible} value={form.weight} onChange={change} />
            </div>
            {!physicalEligible && nextPhysicalDate && (
              <p className="text-tertiary-fixed-dim text-sm">Disponible el {nextPhysicalDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            )}
            <Button type="submit" variant="secondary" disabled={!physicalEligible || !physicalChanged || physicalSaving} className="w-full">
              {physicalSaving ? 'Actualizando...' : 'Actualizar datos físicos'}
            </Button>
          </Card>
        </form>

        {message && <p role="status" className="text-primary-fixed-dim text-center">{message}</p>}
        {saveError && <p role="alert" className="text-error text-center">{saveError}</p>}

        <Button variant="secondary" className="w-full border-error/30 text-error" onClick={signOut}>
          <span className="material-symbols-outlined" aria-hidden="true">logout</span>
          Cerrar sesión
        </Button>
      </div>
    </Layout>
  );
}

export default Perfil;
