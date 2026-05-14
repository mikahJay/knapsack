export type MatchSideAction = 'rejected' | 'clarify' | 'soft_yes' | 'snoozed' | 'flagged';

export type PairStatus =
  | 'open'
  | 'in_conversation'
  | 'mutual_interest'
  | 'closed_rejected'
  | 'closed_flagged';

/**
 * Derives pair-level status from the latest action on each side (need owner vs resource owner).
 * Precedence: any flag closes as flagged; any reject closes as rejected; else mutual soft_yes;
 * else any clarify/soft_yes yields in_conversation; else open.
 */
export function reconcilePairStatus(
  needOwnerAction: MatchSideAction | null | undefined,
  resourceOwnerAction: MatchSideAction | null | undefined
): PairStatus {
  if (needOwnerAction === 'flagged' || resourceOwnerAction === 'flagged') {
    return 'closed_flagged';
  }
  if (needOwnerAction === 'rejected' || resourceOwnerAction === 'rejected') {
    return 'closed_rejected';
  }
  if (needOwnerAction === 'soft_yes' && resourceOwnerAction === 'soft_yes') {
    return 'mutual_interest';
  }
  const conv = (a: MatchSideAction | null | undefined) => a === 'clarify' || a === 'soft_yes';
  if (conv(needOwnerAction) || conv(resourceOwnerAction)) {
    return 'in_conversation';
  }
  return 'open';
}
