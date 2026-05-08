import { SendEmailCommand } from "@aws-sdk/client-ses";
import { render } from "@react-email/render";
import { type ComponentType, createElement } from "react";
import { ses } from "./client.js";
import { templates } from "./templates/index.js";
import type { SendEmailOptions, TemplateId, TemplateParams } from "./types.js";

const toArray = (v: string | string[]): string[] => (Array.isArray(v) ? v : [v]);

export const sendEmail = async <T extends TemplateId>(opts: SendEmailOptions<T>): Promise<void> => {
  const Template = templates[opts.template] as ComponentType<TemplateParams[T]>;
  const element = createElement(Template, opts.params);

  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  await ses.send(
    new SendEmailCommand({
      Source: opts.from,
      Destination: {
        ToAddresses: toArray(opts.to),
        ...(opts.cc ? { CcAddresses: toArray(opts.cc) } : {}),
        ...(opts.bcc ? { BccAddresses: toArray(opts.bcc) } : {}),
      },
      Message: {
        Subject: { Data: opts.subject },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
      ...(opts.replyTo ? { ReplyToAddresses: [opts.replyTo] } : {}),
    }),
  );
};
