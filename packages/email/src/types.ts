// No active email templates — kept for future use
// biome-ignore lint/suspicious/noEmptyInterface: intentionally empty, serves as extension point
export interface TemplateParams {}

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
