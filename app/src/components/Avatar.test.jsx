import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders an accessible profile image', () => {
    render(<Avatar name="Aaron" src="https://example.com/a.webp" />);
    expect(screen.getByRole('img', { name: 'Foto de Aaron' })).toHaveAttribute('src', 'https://example.com/a.webp');
  });

  it('falls back to the uppercase initial without a URL', () => {
    render(<Avatar name="alexa" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('uses U for an empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('falls back after an image error', () => {
    render(<Avatar name="Aaron" src="broken.webp" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
