import type { ColumnType, Insertable, Updateable } from "kysely";

export type Timestamp = ColumnType<Date | null, Date | null, Date | null>;

export type NullableCol<T> = ColumnType<T | null, T | null, T | null>;

export type OrderDirection = "asc" | "desc";

export type StrN = NullableCol<string>;
export type NumN = NullableCol<number>;
export type UuidN = NullableCol<string>;

export type EnumN<T extends string> = NullableCol<T>; // enum-like string | null

// Columns you never want to supply on inserts/updates
export type AuditTimeKeys = "createdAt" | "updatedAt";
export type AuditKeys = "id" | AuditTimeKeys;

// Generic “new row” type: drop id/createdAt/updatedAt
export type NewRow<T> = Omit<Insertable<T>, AuditKeys>;

// Same, but let you exclude a few more columns that your app fills in
export type NewRowExcept<T, Extra extends keyof T = never> = Omit<Insertable<T>, AuditKeys | Extra>;

// Patch/update type: usually you still don’t want to set audit fields
export type PatchRow<T> = Omit<Updateable<T>, AuditKeys>;

export enum Roles {
  HeadOwner = "Head Owner",
  HeadAccountant = "Head Accountant",
  Owner = "Owner",
  Accountant = "Accountant",
  Agent = "Agent",
  Carrier = "Carrier",
}
