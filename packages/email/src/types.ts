export interface TemplateParams {
  carrier_reminder: {
    invoiceId: string;
    loadId: string;
    dueAt: string;
    amount: string;
    currency: string;
  };
  broker_overdue: {
    invoiceId: string;
    loadId: string;
    dueAt: string;
    amount: string;
    currency: string;
  };
}

export type TemplateId = keyof TemplateParams;

export interface SendEmailOptions<T extends TemplateId> {
  /** Verified SES sender address */
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  template: T;
  params: TemplateParams[T];
}
