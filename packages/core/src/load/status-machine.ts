import type { LoadStatus } from "@twy/db";

type Transition = [from: LoadStatus, to: LoadStatus];

const TRANSITIONS: Transition[] = [
  ["Pending", "Approved"],
  ["Pending", "Hold"],
  ["Pending", "Declined"],
  ["Pending", "Delivered"],
  ["Approved", "Hold"],
  ["Approved", "Declined"],
  ["Approved", "Delivered"],
  ["Hold", "Approved"],
  ["Delivered", "Hold"],
];

export class InvalidTransitionError extends Error {
  readonly code = "invalid_transition" as const;

  constructor(
    readonly from: LoadStatus,
    readonly to: LoadStatus,
    readonly allowed: LoadStatus[],
  ) {
    super(`Cannot transition load status from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
  }
}

export const isValidTransition = (from: LoadStatus, to: LoadStatus): boolean =>
  TRANSITIONS.some(([f, t]) => f === from && t === to);

export const getAllowedTransitions = (from: LoadStatus): LoadStatus[] =>
  TRANSITIONS.filter(([f]) => f === from).map(([, t]) => t);

export const assertValidTransition = (from: LoadStatus, to: LoadStatus): void => {
  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(from, to, getAllowedTransitions(from));
  }
};
