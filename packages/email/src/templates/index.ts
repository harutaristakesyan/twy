import type { ComponentType } from "react";
import type { TemplateId, TemplateParams } from "../types.js";
import BrokerOverdueEmail from "./broker-overdue.js";
import CarrierReminderEmail from "./carrier-reminder.js";

export const templates: { [K in TemplateId]: ComponentType<TemplateParams[K]> } = {
  carrier_reminder: CarrierReminderEmail,
  broker_overdue: BrokerOverdueEmail,
};
