import { z } from 'zod';
import { ApplicationStatus } from '../types';
import { BorrowerInfoSchema, PropertyInfoSchema } from '../models/mortgage.schema';

export const createApplicationSchema = z.object({
  // Note: userId comes from authenticated user, not from request body
  borrowerInfo: BorrowerInfoSchema,
  propertyInfo: PropertyInfoSchema,
  notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  applicationId: z.string().uuid('Invalid applicationId format'),
  newStatus: z.nativeEnum(ApplicationStatus),
  notes: z.string().optional(),
});

const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.SUBMITTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.DOCUMENTS_REQUESTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.DOCUMENTS_REQUESTED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
  ],
  [ApplicationStatus.DOCUMENTS_REQUESTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.APPROVED]: [],
  [ApplicationStatus.DENIED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

export function validateStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
