import { loadStatusValues, paymentStatusValues } from "@twy/db";

export const PERMISSION_REGISTRY = {
  loads: {
    actions: ["add", "view", "edit", "delete"] as const,
    transitions: loadStatusValues,
  },
  payment_orders: {
    actions: ["add", "view", "edit", "delete"] as const,
    transitions: paymentStatusValues,
  },
  brokers: { actions: ["add", "view", "edit", "delete"] as const },
  brokers_requests: { actions: ["view", "edit"] as const },
  carriers_twy: { actions: ["add", "view", "edit", "delete"] as const },
  carriers_outside: { actions: ["add", "view", "edit", "delete"] as const },
  carriers_requests: { actions: ["view", "edit"] as const },
  teams: { actions: ["add", "view", "edit", "delete"] as const },
  users: { actions: ["add", "view", "edit", "delete"] as const },
  branches: { actions: ["add", "view", "edit", "delete"] as const },
  external_billing: { actions: ["view"] as const },
  internal_billing: { actions: ["view"] as const },
} as const;

export type Entity = keyof typeof PERMISSION_REGISTRY;
export type BaseAction = "add" | "view" | "edit" | "delete";
export type TransitionAction = `transition:${string}`;
export type PermissionAction = BaseAction | TransitionAction;

export type RegistryEntry = {
  name: Entity;
  actions: readonly string[];
  transitions?: readonly string[];
};

export const isKnownPermission = (entity: string, action: string): boolean => {
  if (!(entity in PERMISSION_REGISTRY)) return false;
  const entry = PERMISSION_REGISTRY[entity as Entity];

  if (action.startsWith("transition:")) {
    if (!("transitions" in entry)) return false;
    const status = action.slice("transition:".length);
    return (entry.transitions as readonly string[]).includes(status);
  }

  return (entry.actions as readonly string[]).includes(action);
};

export const expandRegistry = (): RegistryEntry[] =>
  (Object.keys(PERMISSION_REGISTRY) as Entity[]).map((name) => {
    const entry = PERMISSION_REGISTRY[name];
    const result: RegistryEntry = { name, actions: entry.actions };
    if ("transitions" in entry) {
      result.transitions = entry.transitions;
    }
    return result;
  });
