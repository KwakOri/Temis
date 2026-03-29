'use client';

import { V2TemplateRenderConfigProvider } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useV2TemplateRenderConfig } from '@/hooks/query/useV2TemplateRenderConfig';
import type { V2TemplateRenderConfigResponse } from '@/services/v2_template_render_config_service';
import { v2_createDefaultTemplateRenderConfig } from '@/utils/time-table/v2_template_render_config';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import TimeTableEditor from './_components/_uneditable/TimeTableEditor';
import './_styles/index.css';

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TimeTableTemplatePage = () => {
  const searchParams = useSearchParams();
  const rawTemplateId = searchParams.get('templateId');

  const templateId = useMemo(() => {
    if (!rawTemplateId) return undefined;
    return v2_TEMPLATE_ID_REGEX.test(rawTemplateId) ? rawTemplateId : undefined;
  }, [rawTemplateId]);

  const { data, isLoading } = useV2TemplateRenderConfig(templateId);

  const exampleData: V2TemplateRenderConfigResponse = {
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
      baseFonts: {
        primary: 'Escoredream',
        secondary: 'Pretendard',
        tertiary: 'Arial',
        quaternary: 'sans-serif',
      },
      baseColors: {
        first: {
          primary: '#86889B',
          secondary: '#BBBBBB',
          tertiary: '#FFFFFF',
          quaternary: '#A7A7A7',
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
        MAIN_TITLE: '#86889B',
        SUB_TITLE: '#BBBBBB',
        STREAMING_TIME: '#FFFFFF',
        STREAMING_DATE: '#FFFFFF',
        STREAMING_DAY: '#E0E0E0',
        ARTIST: '#111111',
        WEEKLY_FLAG: '#A7A7A7',
      },
      componentFonts: {
        MAIN_TITLE: 'Escoredream',
        SUB_TITLE: 'Escoredream',
        STREAMING_TIME: 'Escoredream',
        STREAMING_DATE: 'Escoredream',
        STREAMING_DAY: 'Escoredream',
        ARTIST: 'Escoredream',
        WEEKLY_FLAG: 'Escoredream',
      },
      maxFontSizes: {
        MAIN_TITLE: 70,
        SUB_TITLE: 42,
        ARTIST: 36,
      },
      cardSizes: {
        online: {
          width: 634,
          height: 558,
        },
        offline: {
          width: 634,
          height: 558,
        },
        profile: {
          width: 1300,
          height: 1770,
        },
        frame: {
          width: 4000,
          height: 2250,
        },
      },
      profileTextPlaceholder: '',
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
          first: '/time-table/v2/bg-first.png',
          second: '/time-table/v2/bg-second.png',
          third: '/time-table/v2/bg-third.png',
        },
        topObjectByTheme: {
          first: '/time-table/v2/top-object-first.png',
          second: '/time-table/v2/top-object-second.png',
          third: '/time-table/v2/top-object-third.png',
        },
        onlineByTheme: {
          first: '/time-table/v2/online-first.png',
          second: '/time-table/v2/online-second.png',
          third: '/time-table/v2/online-third.png',
        },
        offlineByTheme: {
          first: '/time-table/v2/offline-first.png',
          second: '/time-table/v2/offline-second.png',
          third: '/time-table/v2/offline-third.png',
        },
        profileFrameByTheme: {
          first: '/time-table/v2/frame-first.png',
          second: '/time-table/v2/frame-second.png',
          third: '/time-table/v2/frame-third.png',
        },
        profileBgByTheme: {
          first: '/time-table/v2/profile-bg-first.png',
          second: '/time-table/v2/profile-bg-second.png',
          third: '/time-table/v2/profile-bg-third.png',
        },
      },
      layout: {
        grid: {
          right: 264,
          top: 244,
          rowGap: 32,
          columnGap: 72,
          columns: 3,
        },
        weekFlag: {
          fontSize: 68,
          fontWeight: 500,
          width: 1000,
          height: 100,
          top: 664,
          left: 1848,
        },
        topObjectContainer: {
          width: 4000,
          height: 2250,
          zIndex: 30,
        },
        profileImage: {
          top: 264,
          left: 218,
          rotateDeg: -6.7,
          zIndex: 10,
        },
        profileFrame: {
          zIndex: 20,
        },
        cell: {
          streamingDay: {
            fontSize: 64,
            height: 80,
            width: 300,
            top: 48,
          },
          streamingDate: {
            width: 120,
            height: 120,
            lineHeight: 1,
            fontSize: 62,
            fontWeight: 600,
            letterSpacing: -1,
            marginTop: 4,
          },
          streamingTime: {
            width: 312,
            height: 80,
            lineHeight: 1,
            fontSize: 38,
            top: 476,
          },
          mainTitleContainer: {
            height: 192,
            widthPercent: 80,
            top: 230,
          },
          subTitleContainer: {
            widthPercent: 80,
            height: 80,
            top: 152,
          },
          contentArea: {
            width: 612,
            height: 528,
            top: 30,
            marginLeft: 16,
          },
        },
      },
    },
    createdAt: '2026-03-29T00:00:00.000Z',
    updatedAt: '2026-03-29T00:00:00.000Z',
  };

  const fallbackConfig = useMemo(
    () => v2_createDefaultTemplateRenderConfig(),
    []
  );
  const resolvedData = data ?? exampleData;
  const renderConfig = resolvedData.renderConfig ?? fallbackConfig;

  const providerValue = useMemo(
    () => ({
      templateId: templateId ?? null,
      source: resolvedData.source ?? 'default',
      isLoading,
      renderConfig,
    }),
    [isLoading, renderConfig, resolvedData.source, templateId]
  );

  return (
    <V2TemplateRenderConfigProvider value={providerValue}>
      <div className="fixed inset-0 w-full h-full">
        <TimeTableEditor />
      </div>
    </V2TemplateRenderConfigProvider>
  );
};

export default TimeTableTemplatePage;
