import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Perfil from './Perfil';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useActiveDuel } from '../hooks/useActiveDuel';
import { useWorkouts } from '../hooks/useWorkouts';
import { updateUserProfile, updatePhysicalProfile } from '../firebase/firestore';
import { logoutUser } from '../firebase/auth';
import { uploadProfilePhoto } from '../cloudinary/uploadProfilePhoto';
import { processProfileImage, validateProfileImage } from '../profile/profileImage';

vi.mock('../contexts/AuthContext');
vi.mock('../hooks/useUserProfile');
vi.mock('../hooks/useActiveDuel');
vi.mock('../hooks/useWorkouts');
vi.mock('../firebase/firestore');
vi.mock('../firebase/auth');
vi.mock('../cloudinary/uploadProfilePhoto');
vi.mock('../profile/profileImage');

const profile = {
  uid: 'aaron', displayName: 'Aaron', email: 'aaron@example.com', gender: 'M',
  age: 30, weight: 78, height: 178, experienceLevel: 'Intermediate',
  objective: 'Ganar fuerza', equipment: ['Mochila'], preferredWorkoutMinutes: 30,
  usualWorkoutTime: '19:00', notificationsEnabled: true, hideScreenshotLocation: true,
};

function renderProfile() {
  return render(<MemoryRouter><Perfil /></MemoryRouter>);
}

describe('Perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: { uid: 'aaron', email: profile.email } });
    useUserProfile.mockReturnValue({ profile, loading: false, error: null, refresh: vi.fn() });
    useActiveDuel.mockReturnValue({ duel: { duelId: 'duel-1', userA_uid: 'aaron', userB_uid: 'alex', weekStartDate: new Date('2026-07-27T00:00:00Z'), weekEndDate: new Date('2026-08-02T23:59:59Z') }, loading: false, error: null });
    useWorkouts.mockReturnValue({ workouts: [
      { workoutId: 'w1', userId: 'aaron', totalMinutes: 30, performedAt: new Date('2026-07-28T18:00:00Z') },
      { workoutId: 'w2', userId: 'aaron', totalMinutes: 25, performedAt: new Date('2026-07-29T18:00:00Z') },
    ], loading: false, error: null });
    updateUserProfile.mockResolvedValue(undefined);
    updatePhysicalProfile.mockResolvedValue(undefined);
    logoutUser.mockResolvedValue(undefined);
    validateProfileImage.mockReturnValue(null);
    processProfileImage.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
    uploadProfilePhoto.mockResolvedValue('https://res.cloudinary.com/dlwlv6iyab/image/upload/avatar.webp');
  });

  it('renders real identity and personal statistics', () => {
    renderProfile();
    expect(screen.getByRole('heading', { name: 'Aaron' })).toBeInTheDocument();
    expect(screen.getByText('2 entrenamientos')).toBeInTheDocument();
    expect(screen.getByText('55 min')).toBeInTheDocument();
    expect(screen.getByText('2 de 7')).toBeInTheDocument();
  });

  it('saves editable profile fields and preferences', async () => {
    const user = userEvent.setup();
    renderProfile();
    const name = screen.getByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Aaron Interian');
    await user.click(screen.getByLabelText(/Ocultar ubicaci.n de capturas/i));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(updateUserProfile).toHaveBeenCalledWith('aaron', expect.objectContaining({
      displayName: 'Aaron Interian', hideScreenshotLocation: false,
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('Perfil actualizado');
  });

  it('disables physical editing until 30 days after the prior update', () => {
    vi.useFakeTimers();
    useUserProfile.mockReturnValue({
      profile: { ...profile, physicalProfileUpdatedAt: new Date('2026-07-20T12:00:00Z') },
      loading: false, error: null, refresh: vi.fn(),
    });
    vi.setSystemTime(new Date('2026-07-31T12:00:00Z'));
    renderProfile();
    expect(screen.getByRole('button', { name: 'Actualizar datos físicos' })).toBeDisabled();
    expect(screen.getByText(/disponible el 19 ago 2026/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('updates eligible physical data separately', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.clear(screen.getByLabelText('Peso (kg)'));
    await user.type(screen.getByLabelText('Peso (kg)'), '79');
    await user.click(screen.getByRole('button', { name: 'Actualizar datos físicos' }));
    await waitFor(() => expect(updatePhysicalProfile).toHaveBeenCalledWith('aaron', { gender: 'M', weight: 79 }));
  });

  it('does not consume the monthly update when physical data is unchanged', () => {
    renderProfile();
    expect(screen.getByRole('button', { name: /Actualizar datos f.sicos/i })).toBeDisabled();
    expect(updatePhysicalProfile).not.toHaveBeenCalled();
  });

  it('requires confirmation before signing out', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderProfile();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logoutUser).toHaveBeenCalledOnce();
  });

  it('rejects an invalid profile photo before upload', async () => {
    validateProfileImage.mockReturnValue('La imagen debe pesar como máximo 2 MB.');
    const user = userEvent.setup();
    renderProfile();
    await user.upload(screen.getByLabelText('Seleccionar foto de perfil'), new File(['x'], 'bad.png', { type: 'image/png' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/2 MB/i);
    expect(uploadProfilePhoto).not.toHaveBeenCalled();
  });

  it('processes, uploads and publishes a valid profile photo', async () => {
    const refresh = vi.fn();
    useUserProfile.mockReturnValue({ profile, loading: false, error: null, refresh });
    const user = userEvent.setup();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    renderProfile();
    await user.upload(screen.getByLabelText('Seleccionar foto de perfil'), file);
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));
    await waitFor(() => expect(processProfileImage).toHaveBeenCalledWith(file));
    expect(uploadProfilePhoto).toHaveBeenCalledWith('aaron', expect.any(Blob), expect.any(Function));
    expect(updateUserProfile).toHaveBeenCalledWith('aaron', { avatarUrl: 'https://res.cloudinary.com/dlwlv6iyab/image/upload/avatar.webp' });
    expect(await screen.findByRole('status')).toHaveTextContent('Foto de perfil actualizada');
    expect(refresh).toHaveBeenCalled();
  });

  it('explains when Cloudinary public configuration is missing', async () => {
    uploadProfilePhoto.mockRejectedValue(new Error('CLOUDINARY_CONFIG_MISSING'));
    const user = userEvent.setup();
    renderProfile();
    await user.upload(screen.getByLabelText('Seleccionar foto de perfil'), new File(['x'], 'avatar.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no está configurada/i);
  });
});
