/**
 * New Application Page
 *
 * Multi-step form to create a new mortgage application.
 * 3 steps: Personal Info, Property Info, Review & Submit
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createApplication } from '@/services/api';

// ============================================================================
// Types
// ============================================================================

type FormStep = 1 | 2 | 3;

interface PersonalInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssnLast4: string;
  annualIncome: string;
  employmentStatus: string;
  employer: string;
}

interface PropertyInfoData {
  street: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  estimatedValue: string;
  loanType: string;
  loanAmount: string;
  downPaymentPercentage: number;
}

interface FormData {
  personal: PersonalInfoData;
  property: PropertyInfoData;
  confirmAccurate: boolean;
}

type FormErrors = Record<string, string>;

// ============================================================================
// Constants
// ============================================================================

const EMPLOYMENT_OPTIONS = [
  { value: 'Employed', label: 'Employed' },
  { value: 'Self-Employed', label: 'Self-Employed' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Other', label: 'Other' },
] as const;

const PROPERTY_TYPE_OPTIONS = [
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Multi-Family', label: 'Multi-Family' },
] as const;

const LOAN_TYPE_OPTIONS = [
  { value: 'Conventional', label: 'Conventional' },
  { value: 'FHA', label: 'FHA' },
  { value: 'VA', label: 'VA' },
  { value: 'USDA', label: 'USDA' },
  { value: 'Jumbo', label: 'Jumbo' },
] as const;

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
] as const;

const INITIAL_FORM_DATA: FormData = {
  personal: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssnLast4: '',
    annualIncome: '',
    employmentStatus: '',
    employer: '',
  },
  property: {
    street: '',
    city: '',
    state: '',
    zip: '',
    propertyType: '',
    estimatedValue: '',
    loanType: '',
    loanAmount: '',
    downPaymentPercentage: 20,
  },
  confirmAccurate: false,
};

// ============================================================================
// Validation Schemas
// ============================================================================

const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[\d\s\-()]+$/, 'Invalid phone format'),
  ssnLast4: z
    .string()
    .length(4, 'Must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Must be 4 digits'),
  annualIncome: z.string().min(1, 'Annual income is required'),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employer: z.string().min(1, 'Employer is required'),
});

const PropertyInfoSchema = z.object({
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z
    .string()
    .length(5, 'ZIP must be 5 digits')
    .regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  propertyType: z.string().min(1, 'Property type is required'),
  estimatedValue: z.string().min(1, 'Estimated value is required'),
  loanType: z.string().min(1, 'Loan type is required'),
  loanAmount: z.string().min(1, 'Loan amount is required'),
  downPaymentPercentage: z.number().min(3, 'Minimum 3%').max(50, 'Maximum 50%'),
});

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

function parseCurrencyToNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function calculateMonthlyPayment(
  loanAmount: number,
  downPaymentPercentage: number,
  annualRate: number = 0.07,
  years: number = 30,
): number {
  const principal = loanAmount * (1 - downPaymentPercentage / 100);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;

  if (principal <= 0 || monthlyRate <= 0) return 0;

  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Math.round(payment);
}

// ============================================================================
// Components
// ============================================================================

interface StepperProps {
  currentStep: FormStep;
  onStepClick: (step: FormStep) => void;
}

function Stepper({ currentStep, onStepClick }: StepperProps): JSX.Element {
  const steps = [
    { step: 1 as const, label: 'Personal Info', icon: '👤' },
    { step: 2 as const, label: 'Property Info', icon: '🏠' },
    { step: 3 as const, label: 'Review', icon: '✓' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.step} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onStepClick(s.step)}
              disabled={s.step > currentStep}
              className={`flex flex-col items-center ${s.step <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold transition-colors ${
                  s.step === currentStep
                    ? 'bg-brand-600 text-white'
                    : s.step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s.step < currentStep ? '✓' : s.step}
              </div>
              <span
                className={`mt-2 text-xs font-medium sm:text-sm ${
                  s.step === currentStep ? 'text-brand-600' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-1 flex-1 rounded ${
                  s.step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps): JSX.Element {
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-75">
        ✕
      </button>
    </div>
  );
}

interface CurrencyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function CurrencyInput({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = '$0',
}: CurrencyInputProps): JSX.Element {
  const [displayValue, setDisplayValue] = useState(value ? formatCurrency(value) : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(rawValue ? formatCurrency(rawValue) : '');
    onChange(rawValue);
  };

  const handleBlur = (): void => {
    if (value) {
      setDisplayValue(formatCurrency(value));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={`input mt-1 ${error !== undefined ? 'border-red-300' : ''}`}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {error !== undefined && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}

function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  maxLength,
}: FormInputProps): JSX.Element {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`input mt-1 ${error !== undefined ? 'border-red-300' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      {error !== undefined && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  error?: string;
  placeholder?: string;
}

function FormSelect({
  id,
  label,
  value,
  onChange,
  options,
  error,
  placeholder = 'Select...',
}: FormSelectProps): JSX.Element {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        className={`input mt-1 ${error !== undefined ? 'border-red-300' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error !== undefined && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface DownPaymentSliderProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

function DownPaymentSlider({ value, onChange, error }: DownPaymentSliderProps): JSX.Element {
  return (
    <div>
      <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700">
        Down Payment: {value}%
      </label>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-sm text-gray-500">3%</span>
        <input
          id="downPayment"
          type="range"
          min="3"
          max="50"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-brand-600"
        />
        <span className="text-sm text-gray-500">50%</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">Typical down payments range from 3% to 20%</p>
      {error !== undefined && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  data: FormData;
  errors: FormErrors;
  onUpdate: (updates: Partial<FormData>) => void;
}

function Step1PersonalInfo({ data, errors, onUpdate }: StepProps): JSX.Element {
  const updatePersonal = (field: keyof PersonalInfoData, value: string): void => {
    onUpdate({
      personal: { ...data.personal, [field]: value },
    });
  };

  const handlePhoneChange = (value: string): void => {
    const formatted = formatPhone(value);
    updatePersonal('phone', formatted);
  };

  const handleSsnChange = (value: string): void => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    updatePersonal('ssnLast4', digits);
  };

  return (
    <div className="card">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Personal Information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          id="firstName"
          label="First Name"
          value={data.personal.firstName}
          onChange={(v) => updatePersonal('firstName', v)}
          error={errors['personal.firstName']}
          placeholder="John"
        />
        <FormInput
          id="lastName"
          label="Last Name"
          value={data.personal.lastName}
          onChange={(v) => updatePersonal('lastName', v)}
          error={errors['personal.lastName']}
          placeholder="Doe"
        />
        <FormInput
          id="email"
          label="Email"
          type="email"
          value={data.personal.email}
          onChange={(v) => updatePersonal('email', v)}
          error={errors['personal.email']}
          placeholder="john.doe@example.com"
        />
        <FormInput
          id="phone"
          label="Phone"
          type="tel"
          value={data.personal.phone}
          onChange={handlePhoneChange}
          error={errors['personal.phone']}
          placeholder="(555) 123-4567"
        />
        <FormInput
          id="ssnLast4"
          label="Last 4 Digits of SSN"
          value={data.personal.ssnLast4}
          onChange={handleSsnChange}
          error={errors['personal.ssnLast4']}
          placeholder="1234"
          maxLength={4}
        />
        <CurrencyInput
          id="annualIncome"
          label="Annual Income"
          value={data.personal.annualIncome}
          onChange={(v) => updatePersonal('annualIncome', v)}
          error={errors['personal.annualIncome']}
          placeholder="$75,000"
        />
        <FormSelect
          id="employmentStatus"
          label="Employment Status"
          value={data.personal.employmentStatus}
          onChange={(v) => updatePersonal('employmentStatus', v)}
          options={EMPLOYMENT_OPTIONS}
          error={errors['personal.employmentStatus']}
        />
        <FormInput
          id="employer"
          label="Employer Name"
          value={data.personal.employer}
          onChange={(v) => updatePersonal('employer', v)}
          error={errors['personal.employer']}
          placeholder="Company Inc."
        />
      </div>
    </div>
  );
}

function Step2PropertyInfo({ data, errors, onUpdate }: StepProps): JSX.Element {
  const updateProperty = (field: keyof PropertyInfoData, value: string | number): void => {
    onUpdate({
      property: { ...data.property, [field]: value },
    });
  };

  const loanAmount = parseCurrencyToNumber(data.property.loanAmount);
  const monthlyPayment = calculateMonthlyPayment(loanAmount, data.property.downPaymentPercentage);

  return (
    <div className="card">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Property Information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            id="street"
            label="Street Address"
            value={data.property.street}
            onChange={(v) => updateProperty('street', v)}
            error={errors['property.street']}
            placeholder="123 Main Street"
          />
        </div>
        <FormInput
          id="city"
          label="City"
          value={data.property.city}
          onChange={(v) => updateProperty('city', v)}
          error={errors['property.city']}
          placeholder="New York"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            id="state"
            label="State"
            value={data.property.state}
            onChange={(v) => updateProperty('state', v)}
            options={US_STATES.map((s) => ({ value: s, label: s }))}
            error={errors['property.state']}
            placeholder="State"
          />
          <FormInput
            id="zip"
            label="ZIP Code"
            value={data.property.zip}
            onChange={(v) => updateProperty('zip', v.replace(/\D/g, '').slice(0, 5))}
            error={errors['property.zip']}
            placeholder="10001"
            maxLength={5}
          />
        </div>
        <FormSelect
          id="propertyType"
          label="Property Type"
          value={data.property.propertyType}
          onChange={(v) => updateProperty('propertyType', v)}
          options={PROPERTY_TYPE_OPTIONS}
          error={errors['property.propertyType']}
        />
        <CurrencyInput
          id="estimatedValue"
          label="Estimated Property Value"
          value={data.property.estimatedValue}
          onChange={(v) => updateProperty('estimatedValue', v)}
          error={errors['property.estimatedValue']}
          placeholder="$400,000"
        />
        <FormSelect
          id="loanType"
          label="Loan Type"
          value={data.property.loanType}
          onChange={(v) => updateProperty('loanType', v)}
          options={LOAN_TYPE_OPTIONS}
          error={errors['property.loanType']}
        />
        <CurrencyInput
          id="loanAmount"
          label="Loan Amount Requested"
          value={data.property.loanAmount}
          onChange={(v) => updateProperty('loanAmount', v)}
          error={errors['property.loanAmount']}
          placeholder="$320,000"
        />
        <div className="sm:col-span-2">
          <DownPaymentSlider
            value={data.property.downPaymentPercentage}
            onChange={(v) => updateProperty('downPaymentPercentage', v)}
            error={errors['property.downPaymentPercentage']}
          />
        </div>

        {/* Monthly Payment Estimate */}
        {monthlyPayment > 0 && (
          <div className="sm:col-span-2">
            <div className="rounded-lg bg-brand-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-700">Estimated Monthly Payment</p>
                  <p className="text-xs text-brand-600">Based on 7% APR, 30-year fixed mortgage</p>
                </div>
                <p className="text-2xl font-bold text-brand-700">
                  {formatCurrency(monthlyPayment.toString())}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step3Review({ data, errors, onUpdate }: StepProps): JSX.Element {
  const loanAmount = parseCurrencyToNumber(data.property.loanAmount);
  const monthlyPayment = calculateMonthlyPayment(loanAmount, data.property.downPaymentPercentage);

  const fullAddress = `${data.property.street}, ${data.property.city}, ${data.property.state} ${data.property.zip}`;

  return (
    <div className="space-y-6">
      {/* Personal Information Summary */}
      <div className="card">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-600">
            1
          </span>
          Personal Information
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Full Name</dt>
            <dd className="font-medium text-gray-900">
              {data.personal.firstName} {data.personal.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{data.personal.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="font-medium text-gray-900">{data.personal.phone}</dd>
          </div>
          <div>
            <dt className="text-gray-500">SSN (Last 4)</dt>
            <dd className="font-medium text-gray-900">***-**-{data.personal.ssnLast4}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Annual Income</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(data.personal.annualIncome)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Employment</dt>
            <dd className="font-medium text-gray-900">
              {data.personal.employmentStatus} at {data.personal.employer}
            </dd>
          </div>
        </dl>
      </div>

      {/* Property Information Summary */}
      <div className="card">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-600">
            2
          </span>
          Property Information
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Property Address</dt>
            <dd className="font-medium text-gray-900">{fullAddress}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Property Type</dt>
            <dd className="font-medium text-gray-900">{data.property.propertyType}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Estimated Value</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(data.property.estimatedValue)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Loan Type</dt>
            <dd className="font-medium text-gray-900">{data.property.loanType}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Loan Amount</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(data.property.loanAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Down Payment</dt>
            <dd className="font-medium text-gray-900">{data.property.downPaymentPercentage}%</dd>
          </div>
          <div>
            <dt className="text-gray-500">Est. Monthly Payment</dt>
            <dd className="font-bold text-brand-600">
              {formatCurrency(monthlyPayment.toString())}
            </dd>
          </div>
        </dl>
      </div>

      {/* Confirmation Checkbox */}
      <div className="card">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.confirmAccurate}
            onChange={(e) => onUpdate({ confirmAccurate: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700">
            I confirm that all information provided above is accurate and complete to the best of my
            knowledge. I understand that providing false information may result in the denial of my
            application.
          </span>
        </label>
        {errors['confirmAccurate'] !== undefined && (
          <p className="mt-2 text-sm text-red-600">{errors['confirmAccurate']}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function NewApplicationPage(): JSX.Element {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const updateFormData = useCallback((updates: Partial<FormData>): void => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const validateStep = useCallback(
    (step: FormStep): boolean => {
      setErrors({});
      const newErrors: FormErrors = {};

      if (step === 1) {
        const result = PersonalInfoSchema.safeParse(formData.personal);
        if (!result.success) {
          result.error.errors.forEach((err) => {
            newErrors[`personal.${err.path[0]}`] = err.message;
          });
        }
      } else if (step === 2) {
        const result = PropertyInfoSchema.safeParse(formData.property);
        if (!result.success) {
          result.error.errors.forEach((err) => {
            newErrors[`property.${err.path[0]}`] = err.message;
          });
        }
      } else if (step === 3) {
        if (!formData.confirmAccurate) {
          newErrors['confirmAccurate'] = 'You must confirm the information is accurate';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData],
  );

  const handleNext = useCallback((): void => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((prev) => (prev + 1) as FormStep);
      }
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback((): void => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FormStep);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (step: FormStep): void => {
      if (step < currentStep) {
        setCurrentStep(step);
      } else if (step === currentStep + 1) {
        handleNext();
      }
    },
    [currentStep, handleNext],
  );

  const buildSubmissionData = useMemo(() => {
    const fullAddress = `${formData.property.street}, ${formData.property.city}, ${formData.property.state} ${formData.property.zip}`;

    return {
      borrowerInfo: {
        firstName: formData.personal.firstName,
        lastName: formData.personal.lastName,
        email: formData.personal.email,
        phone: formData.personal.phone,
        ssnLast4: formData.personal.ssnLast4,
        annualIncome: parseCurrencyToNumber(formData.personal.annualIncome),
        employmentStatus: formData.personal.employmentStatus,
        employer: formData.personal.employer,
      },
      propertyInfo: {
        address: fullAddress,
        type: formData.property.propertyType,
        estimatedValue: parseCurrencyToNumber(formData.property.estimatedValue),
        loanAmount: parseCurrencyToNumber(formData.property.loanAmount),
        loanType: formData.property.loanType,
        downPaymentPercentage: formData.property.downPaymentPercentage,
      },
    };
  }, [formData]);

  const handleSaveAsDraft = useCallback(async (): Promise<void> => {
    setIsSavingDraft(true);

    try {
      const result = await createApplication({
        ...buildSubmissionData,
        notes: 'Saved as draft',
      });

      if (result.success && result.data !== undefined) {
        showToast('Application saved as draft!', 'success');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        showToast(result.error?.message ?? 'Failed to save draft', 'error');
      }
    } catch {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  }, [buildSubmissionData, navigate, showToast]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);

    try {
      const result = await createApplication(buildSubmissionData);

      if (result.success && result.data !== undefined) {
        showToast('Application submitted successfully!', 'success');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        showToast(result.error?.message ?? 'Failed to submit application', 'error');
      }
    } catch {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [buildSubmissionData, navigate, showToast, validateStep]);

  return (
    <div className="p-6 lg:p-8">
      {/* Toast Notification */}
      {toast !== null && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">New Application</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Mortgage Application</h1>
        <p className="mt-1 text-gray-600">Complete all steps to submit your application</p>
      </div>

      {/* Stepper */}
      <Stepper currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Step Content */}
      <form onSubmit={(e) => e.preventDefault()}>
        {currentStep === 1 && (
          <Step1PersonalInfo data={formData} errors={errors} onUpdate={updateFormData} />
        )}
        {currentStep === 2 && (
          <Step2PropertyInfo data={formData} errors={errors} onUpdate={updateFormData} />
        )}
        {currentStep === 3 && (
          <Step3Review data={formData} errors={errors} onUpdate={updateFormData} />
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            {currentStep > 1 && (
              <button type="button" onClick={handleBack} className="btn btn-outline">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => void handleSaveAsDraft()}
                disabled={isSavingDraft || isSubmitting}
                className="btn btn-outline"
              >
                {isSavingDraft ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save as Draft'
                )}
              </button>
            )}

            {currentStep < 3 ? (
              <button type="button" onClick={handleNext} className="btn btn-primary">
                Next
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || isSavingDraft}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default NewApplicationPage;
