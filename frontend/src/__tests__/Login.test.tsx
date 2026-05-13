import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

describe('Login page', () => {
  it('signs in as employee and lands on dashboard', async () => {
    render(<App />);
    const email = await screen.findByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);
    await userEvent.type(email, 'emp1@company.com');
    await userEvent.type(password, 'Emp@123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
  });

  it('shows error on invalid login', async () => {
    render(<App />);
    const email = await screen.findByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);
    await userEvent.type(email, 'nope@company.com');
    await userEvent.type(password, 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid credentials/i);
  });
});
