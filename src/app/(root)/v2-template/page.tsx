'use client';

import TemplateEditorClient from '@/app/(root)/admin/template-editor/_components/template-editor-client';
import './_styles/index.css';

const LegacyV2TemplatePage = () => {
  return <TemplateEditorClient allowQueryTemplateId />;
};

export default LegacyV2TemplatePage;
