import { generateEmailVerificationTemplate } from './email-verification-template';
import { generateWelcomeEmailTemplate } from './welcome-email-template';
import { generatePasswordResetTemplate } from './password-reset-template';

export interface EmailTemplateData {
  name?: string;
  email?: string;
  token?: string;
  baseUrl: string;
}

export const EmailTemplates = {
  emailVerification: generateEmailVerificationTemplate,
  welcome: generateWelcomeEmailTemplate,
  passwordReset: generatePasswordResetTemplate,
};

export type EmailTemplateType = keyof typeof EmailTemplates;

export {
  generateEmailVerificationTemplate,
  generateWelcomeEmailTemplate,
  generatePasswordResetTemplate,
};