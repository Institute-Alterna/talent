import { Stage, Status } from '@/lib/generated/prisma/client';
import { recruitment } from '@/config';

export const VALID_STAGES: Stage[] = recruitment.stages.map(s => s.id) as Stage[];

export const VALID_STATUSES: Status[] = ['ACTIVE', 'ACCEPTED', 'REJECTED'];

export const REJECTION_TYPE_NO_GC = 'no-gc';
