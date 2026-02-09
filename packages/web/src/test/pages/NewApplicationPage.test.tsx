import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API module
vi.mock('@/services/api', () => ({
  createApplication: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NewApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step 1 initially', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
  });

  it('should show stepper with 3 steps', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Property Info')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('should show validation errors when trying to proceed without filling required fields', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
  });

  it('should advance to step 2 when step 1 is valid', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Fill step 1 fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });

    // Click next
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Property Information')).toBeInTheDocument();
    });
  });

  it('should format phone number correctly', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    const phoneInput = screen.getByLabelText('Phone');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });

    expect(phoneInput).toHaveValue('(555) 123-4567');
  });

  it('should only allow 4 digits for SSN', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    const ssnInput = screen.getByLabelText('Last 4 Digits of SSN');
    fireEvent.change(ssnInput, { target: { value: '12345abc' } });

    expect(ssnInput).toHaveValue('1234');
  });

  it('should allow navigation back to previous step', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Fill step 1 and advance
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Property Information')).toBeInTheDocument();
    });

    // Click back
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    // Verify data is preserved
    expect(screen.getByLabelText('First Name')).toHaveValue('John');
  });

  it('should have breadcrumb navigation', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New Application')).toBeInTheDocument();
  });

  it('should display page title and description', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('New Mortgage Application')).toBeInTheDocument();
    expect(screen.getByText('Complete all steps to submit your application')).toBeInTheDocument();
  });
});

describe('NewApplicationPage Step 2 - Property Info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show property type dropdown options', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Navigate to step 2
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Property Type')).toBeInTheDocument();
    });

    // Check options
    const propertyTypeSelect = screen.getByLabelText('Property Type');
    expect(propertyTypeSelect).toContainHTML('Single Family');
    expect(propertyTypeSelect).toContainHTML('Condo');
    expect(propertyTypeSelect).toContainHTML('Townhouse');
    expect(propertyTypeSelect).toContainHTML('Multi-Family');
  });

  it('should show loan type dropdown options', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Navigate to step 2
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Loan Type')).toBeInTheDocument();
    });

    // Check options
    const loanTypeSelect = screen.getByLabelText('Loan Type');
    expect(loanTypeSelect).toContainHTML('Conventional');
    expect(loanTypeSelect).toContainHTML('FHA');
    expect(loanTypeSelect).toContainHTML('VA');
    expect(loanTypeSelect).toContainHTML('USDA');
    expect(loanTypeSelect).toContainHTML('Jumbo');
  });

  it('should have down payment slider', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Navigate to step 2
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Down Payment: 20%/)).toBeInTheDocument();
    });
  });
});

describe('NewApplicationPage Step 3 - Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show confirmation checkbox requirement on step 3', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Fill step 1
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 2
    await waitFor(() => {
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Street Address'), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });
    fireEvent.change(screen.getByLabelText('Property Type'), {
      target: { value: 'Single Family' },
    });
    fireEvent.change(screen.getByLabelText('Estimated Property Value'), {
      target: { value: '400000' },
    });
    fireEvent.change(screen.getByLabelText('Loan Type'), { target: { value: 'Conventional' } });
    fireEvent.change(screen.getByLabelText('Loan Amount Requested'), {
      target: { value: '320000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Verify we're on step 3
    await waitFor(() => {
      expect(screen.getByText('Submit Application')).toBeInTheDocument();
    });

    // Try to submit without checking confirmation
    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(screen.getByText('You must confirm the information is accurate')).toBeInTheDocument();
    });
  });

  it('should show both Save as Draft and Submit buttons on step 3', async () => {
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    // Fill step 1
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits of SSN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Employment Status'), { target: { value: 'Employed' } });
    fireEvent.change(screen.getByLabelText('Employer Name'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 2
    await waitFor(() => {
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Street Address'), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });
    fireEvent.change(screen.getByLabelText('Property Type'), {
      target: { value: 'Single Family' },
    });
    fireEvent.change(screen.getByLabelText('Estimated Property Value'), {
      target: { value: '400000' },
    });
    fireEvent.change(screen.getByLabelText('Loan Type'), { target: { value: 'Conventional' } });
    fireEvent.change(screen.getByLabelText('Loan Amount Requested'), {
      target: { value: '320000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Verify we're on step 3 and both buttons are visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save as draft/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
    });
  });
});

describe('Utility functions', () => {
  it('should format currency correctly', async () => {
    // Import the component to get the formatting functions
    await import('@/pages/NewApplicationPage');

    // Since the functions are internal, we test them through the UI
    const NewApplicationPage = (await import('@/pages/NewApplicationPage')).default;

    render(
      <MemoryRouter>
        <NewApplicationPage />
      </MemoryRouter>,
    );

    const incomeInput = screen.getByLabelText('Annual Income');
    fireEvent.change(incomeInput, { target: { value: '75000' } });
    fireEvent.blur(incomeInput);

    expect(incomeInput).toHaveValue('$75,000');
  });
});
