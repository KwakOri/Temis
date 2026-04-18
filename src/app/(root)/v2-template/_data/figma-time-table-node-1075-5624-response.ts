import type { V2TemplateRenderConfigResponse } from "@/services/v2_template_render_config_service";
import { v2_createDefaultTemplateRenderConfig } from "@/utils/v2/template-render-config";
import { Imgs } from "../_img/imgs";

const v2_withAllThemes = <T,>(value: T): Record<string, T> => ({
  first: value,
  second: value,
  third: value,
});

const v2_withAllThemeDimensions = (width: number, height: number) =>
  v2_withAllThemes({ width, height });

const v2_overrideFieldPlaceholder = ({
  key,
  fields,
  placeholder,
}: {
  key: string;
  fields: ReturnType<typeof v2_createDefaultTemplateRenderConfig>["formSchema"]["fields"];
  placeholder: string;
}) => {
  return fields.map((field) =>
    field.key === key
      ? {
          ...field,
          placeholder,
        }
      : field
  );
};

export const v2_createFigmaTimeTableNode1075_5624RenderConfigResponse =
  (): V2TemplateRenderConfigResponse => {
    const fallbackConfig = v2_createDefaultTemplateRenderConfig();

    return {
      success: true,
      templateId: "00000000-0000-0000-0000-000000000000",
      source: "empty",
      configVersion: 1,
      renderConfig: {
        ...fallbackConfig,
        metadata: {
          schema: "v2_template_render_config",
          name: "figma_time_table_1075_5624",
          description:
            "Figma Time-Table node 1075:5624 기준 스타일 구조화 데이터",
        },
        templateSize: {
          width: 4000,
          height: 2250,
        },
        baseFonts: {
          primary: "schoolSafetyNotification",
          secondary: "bagelFat",
          tertiary: "schoolSafetyNotification",
          quaternary: "schoolSafetyNotification",
        },
        componentColors: {
          ...fallbackConfig.componentColors,
          MAIN_TITLE: "#EC7363",
          SUB_TITLE: "#FFF4E0",
          STREAMING_TIME: "#FFF4E0",
          STREAMING_DATE: "#FFF6E5",
          STREAMING_DAY: "#FFF4E0",
          ARTIST: "#FFF4DF",
          WEEKLY_FLAG: "#FFF6E5",
        },
        componentFonts: {
          ...fallbackConfig.componentFonts,
          MAIN_TITLE: "primary",
          SUB_TITLE: "primary",
          STREAMING_TIME: "primary",
          STREAMING_DATE: "secondary",
          STREAMING_DAY: "primary",
          ARTIST: "primary",
          WEEKLY_FLAG: "primary",
        },
        maxFontSizes: {
          ...fallbackConfig.maxFontSizes,
          MAIN_TITLE: 82,
          SUB_TITLE: 58,
          ARTIST: 76,
        },
        weekDateFormat: {
          ...fallbackConfig.weekDateFormat,
          locale: "en",
          dateOrder: "mdy",
          includeYear: false,
          monthStyle: "numeric",
          dateStyle: "numeric",
          dateSeparator: "/",
          monthDateSeparator: "/",
          rangeSeparator: " - ",
        },
        profileTextPlaceholder: "아티스트 명",
        formSchema: {
          ...fallbackConfig.formSchema,
          fields: v2_overrideFieldPlaceholder({
            key: "subTitle",
            placeholder: "서브 타이틀 적는 곳",
            fields: v2_overrideFieldPlaceholder({
              key: "mainTitle",
              placeholder: "메인 타이틀 적는 곳",
              fields: fallbackConfig.formSchema.fields,
            }),
          }),
        },
        assets: {
          ...fallbackConfig.assets,
          bgByTheme: v2_withAllThemes(Imgs.first.bg.src),
          topObjectByTheme: v2_withAllThemes(Imgs.first.topObject.src),
          memoByTheme: v2_withAllThemes(Imgs.first.memo.src),
          artist: v2_withAllThemes(Imgs.first.artist.src),
          onlineByTheme: v2_withAllThemes(Imgs.first.online.src),
          offlineByTheme: v2_withAllThemes(Imgs.first.offline.src),
          profileFrameByTheme: v2_withAllThemes(Imgs.first.profileFrame.src),
          profileBgByTheme: v2_withAllThemes(Imgs.first.artist.src),
          guideByTheme: v2_withAllThemes(null),
        },
        assetDimensions: {
          ...fallbackConfig.assetDimensions,
          bgByTheme: v2_withAllThemeDimensions(4000, 2250),
          topObjectByTheme: v2_withAllThemeDimensions(4000, 2250),
          memoByTheme: v2_withAllThemeDimensions(720, 560),
          artist: v2_withAllThemeDimensions(4000, 2250),
          onlineByTheme: v2_withAllThemeDimensions(720, 560),
          offlineByTheme: v2_withAllThemeDimensions(720, 560),
          profileFrameByTheme: v2_withAllThemeDimensions(4000, 2250),
          profileBgByTheme: v2_withAllThemeDimensions(4000, 2250),
          guideByTheme: v2_withAllThemes(null),
        },
        layout: {
          ...fallbackConfig.layout,
          grid: {
            ...fallbackConfig.layout.grid,
            layoutMode: "grid3x3",
            left: 33,
            top: 121,
            width: 2201,
            height: 1816,
            rowGap: 68,
            columnGap: 20,
            columns: 3,
            gridEmptySlotA: 3,
            gridEmptySlotB: 6,
          },
          weekFlag: {
            ...fallbackConfig.layout.weekFlag,
            left: 1557,
            top: 568,
            width: 580,
            height: 114,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1,
          },
          topObjectContainer: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
            zIndex: 50,
          },
          profileImage: {
            position: "absolute",
            left: 2400,
            top: 496,
            width: 1540,
            height: 1540,
            zIndex: 20,
          },
          profileFrame: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
            zIndex: 10,
          },
          profileTextRootStyle: {
            position: "absolute",
            left: 2630,
            top: 1820,
            width: 1000,
            height: 120,
            zIndex: 30,
            justifyContent: "center",
            alignItems: "center",
          },
          profileTextWrapperStyle: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 1000,
            height: 120,
            rotateDeg: 1.8,
          },
          profileTextStyle: {
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1,
            textAlign: "center",
          },
          profileTextArtistImageStyle: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
          },
          card: {
            ...fallbackConfig.layout.card,
            streamingDay: {
              ...fallbackConfig.layout.card.streamingDay,
              position: "absolute",
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              opacity: 0,
              pointerEvents: "none",
            },
            streamingDate: {
              ...fallbackConfig.layout.card.streamingDate,
              left: 31,
              top: 3,
              width: 160,
              height: 100,
              zIndex: 10,
            },
            streamingTime: {
              ...fallbackConfig.layout.card.streamingTime,
              left: 98,
              top: 476,
              width: 540,
              height: 40,
            },
            mainTitleContainer: {
              left: 98,
              top: 123,
              width: 540,
              height: 240,
            },
            subTitleContainer: {
              left: 98,
              top: 404,
              width: 540,
              height: 76,
            },
            container: {
              ...fallbackConfig.layout.card.container,
              left: 0,
              top: 0,
              width: 720,
              height: 560,
            },
            mainTitleTextStyle: {
              ...fallbackConfig.layout.card.mainTitleTextStyle,
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1,
              textAlign: "center",
            },
            subTitleTextStyle: {
              ...fallbackConfig.layout.card.subTitleTextStyle,
              fontSize: 58,
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: -1.16,
              textAlign: "center",
            },
            mainTitleOptions: {
              ...fallbackConfig.layout.card.mainTitleOptions,
              maxFontSize: 82,
              multiline: true,
            },
            subTitleOptions: {
              ...fallbackConfig.layout.card.subTitleOptions,
              maxFontSize: 58,
              multiline: false,
            },
            streamingDayStyle: {
              ...fallbackConfig.layout.card.streamingDayStyle,
              fontSize: 1,
              opacity: 0,
              lineHeight: 1,
            },
            streamingDateStyle: {
              ...fallbackConfig.layout.card.streamingDateStyle,
              fontSize: 68,
              opacity: 1,
              lineHeight: 1,
              letterSpacing: 0,
            },
            streamingTimeStyle: {
              ...fallbackConfig.layout.card.streamingTimeStyle,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1,
              textAlign: "center",
            },
            mainTitleWrapperStyle: {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
            subTitleWrapperStyle: {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
          },
          scene: {
            ...fallbackConfig.layout.scene,
            cardsContainer: {
              position: "absolute",
              left: 33,
              top: 121,
              width: 2201,
              height: 1816,
            },
            memoContainer: {
              position: "absolute",
              left: 1513,
              top: 749,
              width: 720,
              height: 560,
              zIndex: 60,
            },
            memoContentContainer: {
              position: "absolute",
              left: 1513,
              top: 749,
              width: 720,
              height: 560,
            },
            memoTextContainer: {
              position: "absolute",
              left: 100,
              top: 160,
              width: 520,
              height: 300,
            },
            memoTextStyle: {
              color: "#EC6F62",
              fontFamily: "Escoredream",
              fontSize: 56,
              fontWeight: 600,
              lineHeight: 1,
              textAlign: "center",
            },
          },
        },
      },
      createdAt: null,
      updatedAt: null,
    };
  };
