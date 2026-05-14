import { reconcilePairStatus } from './pairStatus';

describe('reconcilePairStatus', () => {
  it('returns open when no positive actions', () => {
    expect(reconcilePairStatus(null, null)).toBe('open');
    expect(reconcilePairStatus('snoozed', 'snoozed')).toBe('open');
  });

  it('returns in_conversation when one side soft_yes', () => {
    expect(reconcilePairStatus('soft_yes', null)).toBe('in_conversation');
    expect(reconcilePairStatus(null, 'soft_yes')).toBe('in_conversation');
  });

  it('returns mutual_interest when both soft_yes', () => {
    expect(reconcilePairStatus('soft_yes', 'soft_yes')).toBe('mutual_interest');
  });

  it('returns in_conversation for clarify combinations', () => {
    expect(reconcilePairStatus('clarify', null)).toBe('in_conversation');
    expect(reconcilePairStatus('clarify', 'soft_yes')).toBe('in_conversation');
  });

  it('reject wins over soft_yes', () => {
    expect(reconcilePairStatus('rejected', 'soft_yes')).toBe('closed_rejected');
    expect(reconcilePairStatus('soft_yes', 'rejected')).toBe('closed_rejected');
  });

  it('flag closes pair', () => {
    expect(reconcilePairStatus('flagged', null)).toBe('closed_flagged');
    expect(reconcilePairStatus('soft_yes', 'flagged')).toBe('closed_flagged');
  });
});
