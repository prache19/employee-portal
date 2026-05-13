import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

describe('Finance page', () => {
  it('shows payslip rows after employee login', async () => {
    render(<App />);
    await userEvent.type(await screen.findByLabelText(/email/i), 'emp1@company.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Emp@123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // sidebar nav link (exact name) — the dashboard tile link has a longer composite name.
    await userEvent.click(await screen.findByRole('link', { name: 'Finance' }));
    expect(await screen.findByText(/apr 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/6800\.00/)).toBeInTheDocument();
  });
});
