import type { ComponentType } from "react";
import type { TemplateId, TemplateParams } from "../types.js";

export const templates = {} as { [K in TemplateId]: ComponentType<TemplateParams[K]> };
