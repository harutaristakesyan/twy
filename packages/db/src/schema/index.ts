export * from "./branch.js";
export * from "./file.js";
export * from "./load.js";
export * from "./outsideBroker.js";
export * from "./users.js";

export enum Roles {
  HeadOwner = "Head Owner",
  HeadAccountant = "Head Accountant",
  Owner = "Owner",
  Accountant = "Accountant",
  Agent = "Agent",
  Carrier = "Carrier",
}

export type OrderDirection = "asc" | "desc";
