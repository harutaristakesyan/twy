import type { LoadStatus } from "@/features/load/types/load";

const TRANSITIONS: [LoadStatus, LoadStatus][] = [
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

export const getAllowedTransitions = (from: LoadStatus): LoadStatus[] =>
  TRANSITIONS.filter(([f]) => f === from).map(([, t]) => t);
