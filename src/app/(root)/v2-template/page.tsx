'use client';

import { V2TemplateRenderConfigProvider } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import type { V2TemplateRenderConfigResponse } from '@/services/v2_template_render_config_service';
import type {
  V2TemplateRenderConfig,
} from '@/types/time-table/v2_template_render_config';
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/time-table/v2_template_render_config';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { V2TemplateFontFaceStyle, V2TimeTableEditor } from './_components';
import { Imgs } from './_img/imgs';
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

  const exampleData = useMemo<V2TemplateRenderConfigResponse>(
    () => ({
      success: true,
      templateId: '00000000-0000-0000-0000-000000000000',
      source: 'db',
      configVersion: 1,
      renderConfig: {
      version: 1,
      metadata: {
        schema: 'v2_template_render_config',
        name: 'example_v2_template',
        description: '_v2_template용 예시 설정 데이터',
      },
      templateSize: {
        width: 4000,
        height: 2250,
      },
      weekdayOption: 'en',
      monthOption: 'en',
      themes: ['first', 'second', 'third'],
      defaultTheme: 'first',
      buttonThemes: [
        { value: 'first', label: 'first' },
        { value: 'second', label: 'second' },
        { value: 'third', label: 'third' },
      ],
      fonts: {
        fontFaceDefaults: {
          ascentOverride: '84%',
          descentOverride: '16%',
          lineGapOverride: '0%',
          sizeAdjust: '100%',
        },
        registry: {
          escoredream: {
            family: 'Escoredream',
            display: 'swap',
            faces: [
              {
                weight: 100,
                style: 'normal',
                src: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-1Thin.woff',
                format: 'woff',
              },
              {
                weight: 400,
                style: 'normal',
                src: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff',
                format: 'woff',
              },
              {
                weight: 700,
                style: 'normal',
                src: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-7ExtraBold.woff',
                format: 'woff',
              },
            ],
          },
        },
      },
      baseFonts: {
        primary: 'escoredream',
        secondary: 'escoredream',
        tertiary: 'escoredream',
        quaternary: 'escoredream',
      },
      baseColors: {
        first: {
          primary: '#FFF6E5',
          secondary: '#EC7363',
          tertiary: '',
          quaternary: '',
        },
        second: {
          primary: '#263238',
          secondary: '#546E7A',
          tertiary: '#ECEFF1',
          quaternary: '#90A4AE',
        },
        third: {
          primary: '#5D4037',
          secondary: '#8D6E63',
          tertiary: '#FFF8E1',
          quaternary: '#BCAAA4',
        },
      },
      componentColors: {
        MAIN_TITLE: '#EC7363',
        SUB_TITLE: '#FFF6E5',
        STREAMING_TIME: '#FFF6E5',
        STREAMING_DATE: '#FFF6E5',
        STREAMING_DAY: '#FFF6E5',
        ARTIST: '#FFF6E5',
        WEEKLY_FLAG: '#FFF6E5',
      },
      componentFonts: {
        MAIN_TITLE: 'primary',
        SUB_TITLE: 'primary',
        STREAMING_TIME: 'primary',
        STREAMING_DATE: 'primary',
        STREAMING_DAY: 'primary',
        ARTIST: 'primary',
        WEEKLY_FLAG: 'primary',
      },
      maxFontSizes: {
        MAIN_TITLE: 82,
        SUB_TITLE: 57,
        ARTIST: 84,
      },
      cardSizes: {
        online: {
          width: 800,
          height: 617,
        },
        offline: {
          width: 800,
          height: 617,
        },
        profile: {
          width: 1540,
          height: 1540,
        },
        frame: {
          width: 4000,
          height: 2250,
        },
      },
      editorOptions: {
        isArtist: true,
        isMultiple: false,
        maxStreamingTimeByDay: 1,
      },
      profileTextPlaceholder: '아티스트 명',
      formSchema: v2_createDefaultTemplateRenderConfig().formSchema,
      cardInputConfig: {
        fields: [
          {
            key: 'time',
            type: 'time',
            placeholder: '10:00',
            required: true,
            defaultValue: '10:00',
          },
          {
            key: 'mainTitle',
            type: 'textarea',
            placeholder: '메인 타이틀\n적는 곳',
            defaultValue: '',
            maxLength: 200,
          },
          {
            key: 'subTitle',
            type: 'text',
            placeholder: '서브 타이틀 적는 곳',
            defaultValue: '',
            maxLength: 50,
          },
        ],
        showLabels: false,
        offlineToggle: {
          label: '휴방',
          activeColor: 'bg-[#3E4A82]',
          inactiveColor: 'bg-gray-300',
        },
      },
      assets: {
        bgByTheme: {
          first: Imgs.first.bg.src,
          second: Imgs.first.bg.src,
          third: Imgs.first.bg.src,
        },
        topObjectByTheme: {
          first: Imgs.first.topObject.src,
          second: Imgs.first.topObject.src,
          third: Imgs.first.topObject.src,
        },
        onlineByTheme: {
          first: Imgs.first.online.src,
          second: Imgs.first.online.src,
          third: Imgs.first.online.src,
        },
        offlineByTheme: {
          first: Imgs.first.offline.src,
          second: Imgs.first.offline.src,
          third: Imgs.first.offline.src,
        },
        profileFrameByTheme: {
          first: Imgs.first.profileFrame.src,
          second: Imgs.first.profileFrame.src,
          third: Imgs.first.profileFrame.src,
        },
        profileBgByTheme: {
          first: Imgs.first.profileFrame.src,
          second: Imgs.first.profileFrame.src,
          third: Imgs.first.profileFrame.src,
        },
      },
      assetDimensions: {
        bgByTheme: {
          first: null,
          second: null,
          third: null,
        },
        topObjectByTheme: {
          first: null,
          second: null,
          third: null,
        },
        onlineByTheme: {
          first: null,
          second: null,
          third: null,
        },
        offlineByTheme: {
          first: null,
          second: null,
          third: null,
        },
        profileFrameByTheme: {
          first: null,
          second: null,
          third: null,
        },
        profileBgByTheme: {
          first: null,
          second: null,
          third: null,
        },
      },
      layout: {
        grid: {
          layoutMode: 'grid3x3',
          flex42ThreeRow: 'bottom',
          flex42Align: 'center',
          left: 32,
          top: 96,
          rowGap: 8,
          columnGap: 20,
          columns: 3,
        },
        weekFlag: {
          fontSize: 76,
          fontWeight: 700,
          width: 580,
          height: 120,
          top: 564,
          left: 1556,
        },
        topObjectContainer: {
          position: 'absolute',
          width: 4000,
          height: 2250,
          zIndex: 30,
        },
        profileImage: {
          top: 516,
          left: 2400,
          zIndex: 10,
        },
        profileFrame: {
          position: 'absolute',
          width: 4000,
          height: 2250,
          zIndex: 20,
        },
        profileTextRootStyle: {
          left: 4,
          zIndex: 30,
          justifyContent: 'flex-start',
          alignItems: 'center',
        },
        profileTextWrapperStyle: {
          position: 'absolute',
          width: 1318,
          height: 160,
          bottom: 268,
          right: 200,
          rotate: '1.6deg',
        },
        card: {
          streamingDay: {
            top: 0,
            left: 0,
            width: 160,
            height: 100,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingLeft: 8,
          },
          streamingDate: {
            width: 160,
            height: 100,
            position: 'absolute',
            top: -16,
            left: -24,
            zIndex: 10,
          },
          streamingTime: {
            width: 252,
            height: 40,
            top: 508,
          },
          mainTitleContainer: {
            height: 280,
            widthPercent: 100,
            top: 132,
          },
          subTitleContainer: {
            widthPercent: 100,
            height: 64,
            top: 440,
          },
          container: {
            width: 600,
            height: 504,
            top: 68,
            left: 10,
          },
          mainTitleTextStyle: {
            lineHeight: 1.2,
            fontWeight: 700,
          },
          subTitleTextStyle: {
            lineHeight: 1,
            fontWeight: 400,
          },
          mainTitleOptions: {
            maxFontSize: 82,
            multiline: true,
          },
          subTitleOptions: {
            maxFontSize: 57,
            multiline: true,
          },
          streamingDayStyle: {
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1,
          },
          streamingDateStyle: {
            fontSize: 68,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: 3,
            rotate: '-14deg',
          },
          streamingTimeStyle: {
            fontSize: 31,
            fontWeight: 400,
            lineHeight: 1,
          },
          mainTitleWrapperStyle: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
        },
      },
      structure: v2_createDefaultTemplateRenderConfig().structure,
    },
      createdAt: '2026-03-29T00:00:00.000Z',
      updatedAt: '2026-03-29T00:00:00.000Z',
    }),
    []
  );

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
    <V2TemplateRenderConfigProvider value={providerValue}>
      <V2TemplateFontFaceStyle />
      <div className="fixed inset-0 w-full h-full">
        <V2TimeTableEditor />
      </div>
    </V2TemplateRenderConfigProvider>
  );
};

export default TimeTableTemplatePage;
