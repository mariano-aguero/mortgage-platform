import { MortgageApplicationSchema } from '../models/mortgage.schema';
import { ApplicationStatus } from '../types';

describe('MortgageApplicationSchema', () => {
  it('should validate a valid application', () => {
    const validApplication = {
      userId: 'user-123',
      status: ApplicationStatus.DRAFT,
      borrowerInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        ssnLast4: '1234',
        annualIncome: 100000,
        employmentStatus: 'Employed',
        employer: 'ACME Corp',
      },
      propertyInfo: {
        address: '123 Main St, Springfield',
        type: 'Single Family',
        estimatedValue: 300000,
        loanAmount: 240000,
        loanType: 'Fixed 30yr',
        downPaymentPercentage: 20,
      },
    };

    const result = MortgageApplicationSchema.safeParse(validApplication);
    expect(result.success).toBe(true);
  });

  it('should fail if email is invalid', () => {
    const invalidApplication = {
      userId: 'user-123',
      borrowerInfo: {
        email: 'not-an-email',
      },
    };

    const result = MortgageApplicationSchema.safeParse(invalidApplication);
    expect(result.success).toBe(false);
  });
});
