import type { CarrierKind } from "@twy/db";
import type { Resource } from "../team/contracts.js";

export function carrierResource(kind: CarrierKind): Resource {
  return kind === "twy" ? "carriers_twy" : "carriers_outside";
}
