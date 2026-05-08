import type { LoadStatus } from "@twy/db";
import createError from "http-errors";

type Transition = [from: LoadStatus, to: LoadStatus];

const VALID_TRANSITIONS: Transition[] = [
  ["Pending", "Approved"],
  ["Pending", "Hold"],
  ["Pending", "Denied"],
  ["Approved", "ApprovedPaid"],
  ["Approved", "Hold"],
  ["ApprovedPaid", "Hold"],
  ["Hold", "Pending"],
  ["Hold", "Approved"],
  ["Denied", "Pending"],
];

export const isValidTransition = (from: LoadStatus, to: LoadStatus): boolean =>
  VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);

export const assertValidTransition = (from: LoadStatus, to: LoadStatus): void => {
  if (!isValidTransition(from, to)) {
    throw new createError.BadRequest(`Cannot transition load status from "${from}" to "${to}"`);
  }
};
