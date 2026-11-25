import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const { login, register } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, register }),
}));

describe('authentication pages', () => {
  beforeEach(() => {
    login.mockReset();
    register.mockReset();
  });

  it('rejects short registration passwords before making an API request', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sample User' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sample@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short-pass' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Password must be at least 12 characters.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('provides labeled login controls and has no detectable accessibility violations', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
