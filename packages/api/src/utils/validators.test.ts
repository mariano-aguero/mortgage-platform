import { ApplicationStatus } from '../types';
import {
  createApplicationSchema,
  updateStatusSchema,
  validateStatusTransition,
} from './validators';

describe('createApplicationSchema', () => {
  const validInput = {
    userId: 'user-123',
    borrowerInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      ssnLast4: '1234',
      annualIncome: 100000,
      employmentStatus: 'Employed',
      employer: 'ACME Corp',
    },
    propertyInfo: {
      address: '123 Main St, City',
      type: 'Single Family',
      estimatedValue: 300000,
      loanAmount: 240000,
      loanType: 'Fixed 30yr',
      downPaymentPercentage: 20,
    },
  };

  it('should validate a valid input', () => {
    const result = createApplicationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate without userId (userId comes from authenticated user)', () => {
    const withoutUserId = {
      borrowerInfo: validInput.borrowerInfo,
      propertyInfo: validInput.propertyInfo,
    };
    const result = createApplicationSchema.safeParse(withoutUserId);
    expect(result.success).toBe(true);
  });

  it('should fail if borrowerInfo email is invalid', () => {
    const invalid = {
      ...validInput,
      borrowerInfo: { ...validInput.borrowerInfo, email: 'not-an-email' },
    };
    const result = createApplicationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes('email'));
      expect(emailError).toBeDefined();
    }
  });

  it('should fail if loanAmount is negative', () => {
    const invalid = {
      ...validInput,
      propertyInfo: { ...validInput.propertyInfo, loanAmount: -50000 },
    };
    const result = createApplicationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should fail if loanAmount is zero', () => {
    const invalid = {
      ...validInput,
      propertyInfo: { ...validInput.propertyInfo, loanAmount: 0 },
    };
    const result = createApplicationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should require loanAmount to be positive', () => {
    const validWithPositiveLoan = {
      ...validInput,
      propertyInfo: { ...validInput.propertyInfo, loanAmount: 1 },
    };
    const result = createApplicationSchema.safeParse(validWithPositiveLoan);
    expect(result.success).toBe(true);
  });

  it('should accept complete valid data with all fields', () => {
    const completeInput = {
      userId: 'user-complete-123',
      borrowerInfo: {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@example.com',
        phone: '5551234567',
        ssnLast4: '9876',
        annualIncome: 125000,
        employmentStatus: 'Full-Time',
        employer: 'Tech Company Inc',
      },
      propertyInfo: {
        address: '456 Oak Avenue, Suite 100, Portland, OR 97201',
        type: 'Condominium',
        estimatedValue: 450000,
        loanAmount: 360000,
        loanType: 'Fixed 15yr',
        downPaymentPercentage: 20,
      },
      notes: 'First-time homebuyer',
    };

    const result = createApplicationSchema.safeParse(completeInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.borrowerInfo.email).toBe('maria.garcia@example.com');
      expect(result.data.propertyInfo.loanAmount).toBe(360000);
      expect(result.data.notes).toBe('First-time homebuyer');
    }
  });
});

describe('updateStatusSchema', () => {
  it('should validate a valid status update', () => {
    const input = {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      newStatus: ApplicationStatus.SUBMITTED,
    };
    const result = updateStatusSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should fail with invalid UUID', () => {
    const input = {
      applicationId: 'not-a-uuid',
      newStatus: ApplicationStatus.SUBMITTED,
    };
    const result = updateStatusSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should fail with invalid status', () => {
    const input = {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      newStatus: 'INVALID_STATUS',
    };
    const result = updateStatusSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('validateStatusTransition', () => {
  it('should allow DRAFT to SUBMITTED', () => {
    expect(validateStatusTransition(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)).toBe(
      true,
    );
  });

  it('should allow DRAFT to WITHDRAWN', () => {
    expect(validateStatusTransition(ApplicationStatus.DRAFT, ApplicationStatus.WITHDRAWN)).toBe(
      true,
    );
  });

  it('should not allow DRAFT to APPROVED', () => {
    expect(validateStatusTransition(ApplicationStatus.DRAFT, ApplicationStatus.APPROVED)).toBe(
      false,
    );
  });

  it('should allow SUBMITTED to UNDER_REVIEW', () => {
    expect(
      validateStatusTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW),
    ).toBe(true);
  });

  it('should allow UNDER_REVIEW to APPROVED', () => {
    expect(
      validateStatusTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED),
    ).toBe(true);
  });

  it('should allow UNDER_REVIEW to DENIED', () => {
    expect(validateStatusTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DENIED)).toBe(
      true,
    );
  });

  it('should not allow transitions from APPROVED', () => {
    expect(validateStatusTransition(ApplicationStatus.APPROVED, ApplicationStatus.DENIED)).toBe(
      false,
    );
  });

  it('should not allow transitions from DENIED', () => {
    expect(validateStatusTransition(ApplicationStatus.DENIED, ApplicationStatus.APPROVED)).toBe(
      false,
    );
  });

  it('should not allow DENIED to SUBMITTED transition', () => {
    expect(validateStatusTransition(ApplicationStatus.DENIED, ApplicationStatus.SUBMITTED)).toBe(
      false,
    );
  });

  it('should not allow transitions from WITHDRAWN', () => {
    expect(validateStatusTransition(ApplicationStatus.WITHDRAWN, ApplicationStatus.DRAFT)).toBe(
      false,
    );
  });
});
