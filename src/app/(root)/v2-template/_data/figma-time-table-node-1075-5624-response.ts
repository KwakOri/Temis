import type { V2TemplateRenderConfigResponse } from "@/services/v2_template_render_config_service";
import { v2_createDefaultTemplateRenderConfig } from "@/utils/time-table/template-render-config";
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
      source: "default",
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
          primary: "Inter",
          secondary: "Inter",
          tertiary: "Inter",
          quaternary: "Inter",
        },
        componentColors: {
          ...fallbackConfig.componentColors,
          MAIN_TITLE: "#000000",
          SUB_TITLE: "#000000",
          STREAMING_TIME: "#000000",
          STREAMING_DATE: "transparent",
          STREAMING_DAY: "transparent",
          ARTIST: "#000000",
          WEEKLY_FLAG: "#FFFFFF",
        },
        maxFontSizes: {
          ...fallbackConfig.maxFontSizes,
          MAIN_TITLE: 64,
          SUB_TITLE: 48,
          ARTIST: 48,
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
          memoByTheme: v2_withAllThemeDimensions(800, 617),
          onlineByTheme: v2_withAllThemeDimensions(800, 617),
          offlineByTheme: v2_withAllThemeDimensions(800, 617),
          profileFrameByTheme: v2_withAllThemeDimensions(4000, 2250),
          profileBgByTheme: v2_withAllThemeDimensions(4000, 2250),
          guideByTheme: v2_withAllThemes(null),
        },
        layout: {
          ...fallbackConfig.layout,
          grid: {
            ...fallbackConfig.layout.grid,
            layoutMode: "grid3x3",
            left: -50,
            top: 126,
            width: 2400,
            height: 1962,
            rowGap: 0,
            columnGap: 0,
            columns: 3,
          },
          weekFlag: {
            ...fallbackConfig.layout.weekFlag,
            left: 1557,
            top: 566,
            width: 580,
            height: 114,
            fontSize: 64,
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
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
            zIndex: 20,
          },
          profileFrame: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
            zIndex: 30,
          },
          profileTextRootStyle: {
            position: "absolute",
            left: 1725,
            top: 940,
            width: 480,
            height: 270,
            zIndex: 40,
            justifyContent: "center",
            alignItems: "center",
          },
          profileTextWrapperStyle: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 480,
            height: 270,
          },
          profileTextStyle: {
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1,
            textAlign: "center",
          },
          card: {
            ...fallbackConfig.layout.card,
            streamingDay: {
              ...fallbackConfig.layout.card.streamingDay,
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              opacity: 0,
              pointerEvents: "none",
            },
            streamingDate: {
              ...fallbackConfig.layout.card.streamingDate,
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              opacity: 0,
              pointerEvents: "none",
            },
            streamingTime: {
              ...fallbackConfig.layout.card.streamingTime,
              left: 141,
              top: 450,
              width: 540,
              height: 92,
            },
            mainTitleContainer: {
              left: 141,
              top: 165,
              width: 540,
              height: 140,
            },
            subTitleContainer: {
              left: 141,
              top: 316,
              width: 540,
              height: 92,
            },
            container: {
              ...fallbackConfig.layout.card.container,
              left: 0,
              top: 0,
              width: 800,
              height: 617,
            },
            mainTitleTextStyle: {
              ...fallbackConfig.layout.card.mainTitleTextStyle,
              fontSize: 64,
              fontWeight: 400,
              lineHeight: 1,
              textAlign: "center",
            },
            subTitleTextStyle: {
              ...fallbackConfig.layout.card.subTitleTextStyle,
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 1,
              textAlign: "center",
            },
            mainTitleOptions: {
              ...fallbackConfig.layout.card.mainTitleOptions,
              maxFontSize: 64,
              multiline: false,
            },
            subTitleOptions: {
              ...fallbackConfig.layout.card.subTitleOptions,
              maxFontSize: 48,
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
              fontSize: 1,
              opacity: 0,
              lineHeight: 1,
              rotate: "0deg",
              letterSpacing: 0,
            },
            streamingTimeStyle: {
              ...fallbackConfig.layout.card.streamingTimeStyle,
              fontSize: 48,
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
              left: -50,
              top: 126,
              width: 2400,
              height: 1962,
            },
            memoContainer: {
              position: "absolute",
              left: 1550,
              top: 746,
              width: 800,
              height: 617,
              zIndex: 60,
            },
            memoTextContainer: {
              position: "absolute",
              left: 175,
              top: 194,
              width: 480,
              height: 270,
            },
            memoTextStyle: {
              fontSize: 48,
              fontWeight: 400,
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
