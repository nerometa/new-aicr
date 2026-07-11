export const TIERS = {
  free: {
    price: 0,
    jobsPerMonth: 3,
    overageRate: 0,
    maxVideoMinutes: 20,
    features: {
      download: false,
      durations: [30],
      orientations: ['portrait'],
      experiments: false,
      maxVariants: 0,
      csvExport: false,
      comparison: false,
      priorityQueue: false,
    },
  },
  pro: {
    price: 490,
    jobsPerMonth: 25,
    overageRate: 25,
    maxVideoMinutes: 60,
    features: {
      download: true,
      durations: [30, 60, 90],
      orientations: ['portrait', 'landscape', 'square'],
      experiments: true,
      maxVariants: 3,
      csvExport: true,
      comparison: false,
      priorityQueue: true,
    },
  },
  business: {
    price: 1590,
    jobsPerMonth: 120,
    overageRate: 19,
    maxVideoMinutes: 120,
    features: {
      download: true,
      durations: [30, 60, 90],
      orientations: ['portrait', 'landscape', 'square'],
      experiments: true,
      maxVariants: Infinity,
      csvExport: true,
      comparison: true,
      priorityQueue: true,
    },
  },
} as const;

export type PlanName = 'free' | 'pro' | 'business';

type TierConfig = {
  price: number;
  jobsPerMonth: number;
  overageRate: number;
  maxVideoMinutes: number;
  features: {
    download: boolean;
    durations: readonly number[];
    orientations: readonly string[];
    experiments: boolean;
    maxVariants: number;
    csvExport: boolean;
    comparison: boolean;
    priorityQueue: boolean;
  };
};

export function getTierConfig(plan: string): TierConfig {
  return (TIERS as Record<string, TierConfig>)[plan] ?? TIERS.free;
}
