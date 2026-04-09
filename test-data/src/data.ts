/** Title-word pools used to build random but readable test-data titles. */

const ADJECTIVES = [
  'Urgent', 'Critical', 'Pending', 'Open', 'Active', 'New', 'Recurring',
  'Seasonal', 'Emergency', 'Routine', 'Special', 'Basic', 'Advanced',
  'Primary', 'Secondary', 'Temporary', 'Ongoing', 'Immediate', 'Delayed',
  'Complex',
];

const NEED_NOUNS = [
  'Support', 'Funding', 'Volunteers', 'Equipment', 'Transport', 'Food',
  'Shelter', 'Clothing', 'Training', 'Mentorship', 'Healthcare', 'Supplies',
  'Assistance', 'Counseling', 'Resources', 'Access', 'Referral', 'Services',
  'Donation', 'Coordination',
];

const RESOURCE_NOUNS = [
  'Vehicle', 'Laptop', 'Projector', 'Office Space', 'Warehouse', 'Storage',
  'Printer', 'Generator', 'Refrigerator', 'Medical Kit', 'Tool Set',
  'Software License', 'Network Switch', 'Camera', 'Tent', 'Uniform Set',
  'Speaker System', 'Bicycle', 'Trailer', 'Workstation',
];

const NEED_STATUSES = ['open', 'fulfilled', 'closed'] as const;
const RESOURCE_STATUSES = ['available', 'allocated', 'retired'] as const;

/** Prefix applied to every test-generated title. Used for targeted cleanup. */
export const TEST_PREFIX = '[TEST-DATA]';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function randomNeedTitle(): string {
  return `${TEST_PREFIX} ${pick(ADJECTIVES)} ${pick(NEED_NOUNS)}`;
}

export function randomResourceTitle(): string {
  return `${TEST_PREFIX} ${pick(ADJECTIVES)} ${pick(RESOURCE_NOUNS)}`;
}

export function randomNeedStatus(): string {
  return pick(NEED_STATUSES);
}

export function randomResourceStatus(): string {
  return pick(RESOURCE_STATUSES);
}

export function randomDescription(kind: 'need' | 'resource'): string {
  const tag = kind === 'need' ? 'need' : 'resource';
  return `Auto-generated test ${tag}. Created by the test-data seeder.`;
}

/**
 * Build an email address for one of the 100 test-owner slots.
 * Slot numbers run from 1 to 100.
 */
export function testOwnerEmail(slot: number): string {
  return `testuser-${String(slot).padStart(3, '0')}@test.local`;
}

export function testOwnerName(slot: number): string {
  return `Test User ${String(slot).padStart(3, '0')}`;
}
