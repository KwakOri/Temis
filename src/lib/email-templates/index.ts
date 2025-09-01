import { generateEmailVerificationTemplate } from './email-verification-template';
import { generateWelcomeEmailTemplate } from './welcome-email-template';
import { generatePasswordResetTemplate } from './password-reset-template';
import { generateTemplateAccessGrantedTemplate } from './template-access-granted';

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
  templateAccessGranted: generateTemplateAccessGrantedTemplate,
};

export type EmailTemplateType = keyof typeof EmailTemplates;

export {
  generateEmailVerificationTemplate,
  generateWelcomeEmailTemplate,
  generatePasswordResetTemplate,
  generateTemplateAccessGrantedTemplate,
};