'use client';

import { TemplateRenderConfigProvider } from '@/contexts/v2/template-render-config-context';
import type {
  V2TemplateRenderConfig,
} from '@/types/time-table/template-render-config';
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/time-table/template-render-config';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { V2TemplateFontFaceStyle, V2TimeTableEditor } from './_components';
import { v2_createExampleRenderConfigResponse } from './_data/example-render-config-response';
import './_styles/index.css';

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const v2_RENDER_CONFIG_STORAGE_PREFIX = 'v2-template-render-config';
const v2_LOCAL_STORAGE_SOFT_LIMIT_BYTES = 2 * 1024 * 1024;

const v2_isQuotaExceededError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const v2_createStorageSafeRenderConfig = (
  current: V2TemplateRenderConfig,
  fallback: V2TemplateRenderConfig
): V2TemplateRenderConfig => {
  return {
    ...current,
    // 이미지 에셋은 localStorage에서 제외한다.
    assets: fallback.assets,
    assetDimensions: fallback.assetDimensions,
  };
};

const TimeTableTemplatePage = () => {
  const searchParams = useSearchParams();
  const rawTemplateId = searchParams.get('templateId');

  const templateId = useMemo(() => {
    if (!rawTemplateId) return undefined;
    return v2_TEMPLATE_ID_REGEX.test(rawTemplateId) ? rawTemplateId : undefined;
  }, [rawTemplateId]);

  const exampleData = useMemo(() => v2_createExampleRenderConfigResponse(), []);

  const fallbackConfig = useMemo(() => v2_createDefaultTemplateRenderConfig(), []);
  const defaultRenderConfig = useMemo<V2TemplateRenderConfig>(
    () => exampleData.renderConfig ?? fallbackConfig,
    [exampleData.renderConfig, fallbackConfig]
  );
  const storageKey = useMemo(
    () => `${v2_RENDER_CONFIG_STORAGE_PREFIX}:${templateId ?? exampleData.templateId}`,
    [exampleData.templateId, templateId]
  );
  const [renderConfig, setRenderConfig] =
    useState<V2TemplateRenderConfig>(defaultRenderConfig);
  const [isLoading, setIsLoading] = useState(true);
  const storageSafeRenderConfig = useMemo(
    () => v2_createStorageSafeRenderConfig(renderConfig, defaultRenderConfig),
    [defaultRenderConfig, renderConfig]
  );

  useEffect(() => {
    setIsLoading(true);
    try {
      const rawStored = window.localStorage.getItem(storageKey);
      if (!rawStored) {
        setRenderConfig(defaultRenderConfig);
        return;
      }
      const parsed = JSON.parse(rawStored);
      setRenderConfig(v2_normalizeTemplateRenderConfig(parsed));
    } catch (error) {
      console.error('Failed to restore render config from localStorage', error);
      setRenderConfig(defaultRenderConfig);
    } finally {
      setIsLoading(false);
    }
  }, [defaultRenderConfig, storageKey]);

  useEffect(() => {
    if (isLoading) return;
    const serialized = JSON.stringify(storageSafeRenderConfig);

    try {
      if (serialized.length > v2_LOCAL_STORAGE_SOFT_LIMIT_BYTES) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(storageKey, serialized);
    } catch (error) {
      if (v2_isQuotaExceededError(error)) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      console.error('Failed to persist render config to localStorage', error);
    }
  }, [isLoading, storageKey, storageSafeRenderConfig]);

  const providerValue = useMemo(
    () => ({
      templateId: templateId ?? null,
      source: 'default' as const,
      isLoading,
      renderConfig,
      setRenderConfig,
    }),
    [isLoading, renderConfig, templateId]
  );

  return (
    <TemplateRenderConfigProvider value={providerValue}>
      <V2TemplateFontFaceStyle />
      <div className="fixed inset-0 w-full h-full">
        <V2TimeTableEditor />
      </div>
    </TemplateRenderConfigProvider>
  );
};

export default TimeTableTemplatePage;
