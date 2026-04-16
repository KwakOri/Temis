import type { V2TemplateRenderConfigResponse } from "@/services/v2_template_render_config_service";
import { v2_createDefaultTemplateRenderConfig } from "@/utils/v2/template-render-config";
import { Imgs } from "../_img/imgs";

export const v2_createExampleRenderConfigResponse =
  (): V2TemplateRenderConfigResponse => {
    const fallbackConfig = v2_createDefaultTemplateRenderConfig();

    return {
      success: true,
      templateId: "00000000-0000-0000-0000-000000000000",
      source: "db",
      configVersion: 1,
      renderConfig: {
        version: 1,
        metadata: {
          schema: "v2_template_render_config",
          name: "example_v2_template",
          description: "_v2_template용 예시 설정 데이터",
        },
        templateSize: {
          width: 4000,
          height: 2250,
        },
        weekdayOption: "en",
        dayLabelFormat: {
          mode: "preset",
          preset: "en",
          custom: {},
        },
        monthOption: "en",
        streamingDayFormat: fallbackConfig.streamingDayFormat,
        streamingTimeFormat: fallbackConfig.streamingTimeFormat,
        weekDateFormat: fallbackConfig.weekDateFormat,
        themes: ["first", "second", "third"],
        defaultTheme: "first",
        buttonThemes: [
          { value: "first", label: "first" },
          { value: "second", label: "second" },
          { value: "third", label: "third" },
        ],
        fonts: {
          fontFaceDefaults: {
            ascentOverride: "84%",
            descentOverride: "16%",
            lineGapOverride: "0%",
            sizeAdjust: "100%",
          },
          registry: {
            escoredream: {
              family: "Escoredream",
              display: "swap",
              faces: [
                {
                  weight: 100,
                  style: "normal",
                  src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-1Thin.woff",
                  format: "woff",
                },
                {
                  weight: 400,
                  style: "normal",
                  src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff",
                  format: "woff",
                },
                {
                  weight: 700,
                  style: "normal",
                  src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-7ExtraBold.woff",
                  format: "woff",
                },
              ],
            },
          },
        },
        baseFonts: {
          primary: "escoredream",
          secondary: "escoredream",
          tertiary: "escoredream",
          quaternary: "escoredream",
        },
        baseColors: {
          first: {
            primary: "#FFF6E5",
            secondary: "#EC7363",
            tertiary: "",
            quaternary: "",
          },
          second: {
            primary: "#263238",
            secondary: "#546E7A",
            tertiary: "#ECEFF1",
            quaternary: "#90A4AE",
          },
          third: {
            primary: "#5D4037",
            secondary: "#8D6E63",
            tertiary: "#FFF8E1",
            quaternary: "#BCAAA4",
          },
        },
        componentColors: {
          MAIN_TITLE: "#EC7363",
          SUB_TITLE: "#FFF6E5",
          STREAMING_TIME: "#FFF6E5",
          STREAMING_DATE: "#FFF6E5",
          STREAMING_DAY: "#FFF6E5",
          ARTIST: "#FFF6E5",
          WEEKLY_FLAG: "#FFF6E5",
        },
        componentFonts: {
          MAIN_TITLE: "primary",
          SUB_TITLE: "primary",
          STREAMING_TIME: "primary",
          STREAMING_DATE: "primary",
          STREAMING_DAY: "primary",
          ARTIST: "primary",
          WEEKLY_FLAG: "primary",
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
          enableThemeSelection: false,
          useOnlineAssetsByDay: false,
          useOfflineAssetsByDay: false,
        },
        profileTextPlaceholder: "아티스트 명",
        formSchema: fallbackConfig.formSchema,
        assets: {
          ...fallbackConfig.assets,
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
          memoByTheme: {
            first: Imgs.first.memo.src,
            second: Imgs.first.memo.src,
            third: Imgs.first.memo.src,
          },
          artist: {
            first: Imgs.first.artist.src,
            second: Imgs.first.artist.src,
            third: Imgs.first.artist.src,
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
            first: Imgs.first.artist.src,
            second: Imgs.first.artist.src,
            third: Imgs.first.artist.src,
          },
          guideByTheme: {
            first: null,
            second: null,
            third: null,
          },
        },
        assetDimensions: {
          ...fallbackConfig.assetDimensions,
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
          memoByTheme: {
            first: null,
            second: null,
            third: null,
          },
          artist: {
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
          guideByTheme: {
            first: null,
            second: null,
            third: null,
          },
        },
        extraAssets: {},
        extraAssetDimensions: {},
        layout: {
          grid: {
            layoutMode: "grid3x3",
            flex42ThreeRow: "bottom",
            flex42Align: "center",
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
            position: "absolute",
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
            position: "absolute",
            width: 4000,
            height: 2250,
            zIndex: 20,
          },
          profileTextRootStyle: {
            left: 4,
            zIndex: 30,
            justifyContent: "flex-start",
            alignItems: "center",
          },
          profileTextWrapperStyle: {
            position: "absolute",
            width: 1318,
            height: 160,
            bottom: 268,
            right: 200,
            rotateDeg: 1.6,
          },
          profileTextArtistImageStyle: {
            position: "absolute",
            left: 0,
            top: 0,
            width: 4000,
            height: 2250,
          },
          card: {
            streamingDay: {
              top: 0,
              left: 0,
              width: 160,
              height: 100,
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              paddingLeft: 8,
            },
            streamingDate: {
              width: 160,
              height: 100,
              position: "absolute",
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
              top: 132,
            },
            subTitleContainer: {
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
            },
            streamingTimeStyle: {
              fontSize: 31,
              fontWeight: 400,
              lineHeight: 1,
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
          scene: {},
        },
        graph: fallbackConfig.graph,
      },
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    };
  };
