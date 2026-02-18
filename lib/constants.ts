import { Stage, Status } from '@/lib/generated/prisma/client';

export const VALID_STAGES: Stage[] = [
  'APPLICATION',
  'GENERAL_COMPETENCIES',
  'SPECIALIZED_COMPETENCIES',
  'INTERVIEW',
  'AGREEMENT',
  'SIGNED',
];

export const VALID_STATUSES: Status[] = ['ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
