import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

const mutationState = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      login: { useMutation: () => mutationState },
      customerLogin: { useMutation: () => mutationState },
    },
    staffs: {
      login: { useMutation: () => mutationState },
    },
    useUtils: () => ({ auth: { me: { invalidate: async () => undefined } } }),
    leads: {
      registerTrial: { useMutation: () => mutationState },
      submitSalesInquiry: { useMutation: () => mutationState },
    },
  },
}));

beforeEach(() => {
  mutationState.isPending = false;
  mutationState.mutateAsync.mockReset();
  mutationState.mutateAsync.mockResolvedValue({ id: 1, status: 'pending_setup' });
});

describe('Home page', () => {
  it('renders functional public footer links with route destinations', () => {
    render(<Home />);

    const expectedLinks = {
      Features: '/features',
      Pricing: '/pricing',
      Security: '/security',
      About: '/about',
      Blog: '/blog',
      Contact: '/contact',
      Documentation: '/documentation',
      API: '/api',
      Support: '/support',
      Privacy: '/privacy',
      Terms: '/terms',
      License: '/license',
    };

    Object.entries(expectedLinks).forEach(([label, href]) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  it('opens and closes the About modal from the Learn More button', () => {
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('About Cyber Café Timer')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByText('Close', {
      exact: true,
      selector: 'button:not([data-slot="dialog-close"])',
    }));

    expect(screen.queryByText('About Cyber Café Timer')).not.toBeInTheDocument();
  });

  it('opens the free trial form and validates required fields', () => {
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: /start your free trial/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/café\/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of pcs/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Free Trial' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please complete all required fields');
  });

  it('opens contact sales and submits successfully', async () => {
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: 'Contact Sales' }));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alex Rivera' } });
    fireEvent.change(screen.getByLabelText(/café\/business name/i), { target: { value: 'Rivera Café' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 0100' } });
    fireEvent.change(screen.getByLabelText(/number of pcs/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Please tell me about setup.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Message sent')).toBeInTheDocument();
    expect(mutationState.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ numberOfPcs: 20, message: 'Please tell me about setup.' }));
  });

  it('disables the submit button while pending', () => {
    mutationState.isPending = true;
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /start your free trial/i }));
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });

  it('shows server errors', async () => {
    mutationState.mutateAsync.mockRejectedValueOnce(new Error('Database unavailable'));
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /start your free trial/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alex Rivera' } });
    fireEvent.change(screen.getByLabelText(/café\/business name/i), { target: { value: 'Rivera Cafe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 0100' } });
    fireEvent.change(screen.getByLabelText(/number of pcs/i), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start Free Trial' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  });
});
