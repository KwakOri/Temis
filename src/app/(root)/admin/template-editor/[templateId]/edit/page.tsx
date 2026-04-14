'use client';

import TemplateEditorClient from '@/app/(root)/admin/template-editor/_components/template-editor-client';
import { useParams } from 'next/navigation';
import '../../../../v2-template/_styles/index.css';

const TemplateEditorEditPage = () => {
  const params = useParams<{ templateId?: string }>();
  const templateId = typeof params?.templateId === 'string' ? params.templateId : undefined;

  return <TemplateEditorClient forcedTemplateId={templateId} />;
};

export default TemplateEditorEditPage;
