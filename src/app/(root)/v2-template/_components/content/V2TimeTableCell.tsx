import React from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { useV2TimeTableEditorRuntimeContext } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { createPlaceholdersFromConfig } from '@/utils/time-table/data';
import { weekdays } from '@/utils/time-table/data';
import { v2_getComponentFontFamily } from '@/utils/time-table/v2_template_render_config';
import { Imgs } from '../../_img/imgs';
import { v2_getHighlightStyle } from './v2_highlight';
import { v2_toRenderableStyle } from './v2_style';

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
}

interface CardStreamingDateProps {
  date: number;
}

interface CardStreamingDayProps {
  dayLabel: string;
}

interface CardMainTitleProps {
  content: string;
}

interface CardSubTitleProps {
  content: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

const CardStreamingDate = ({ date }: CardStreamingDateProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const streamingDateLayout = renderConfig.layout.card.streamingDate;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const streamingDateStyle = v2_toRenderableStyle(
    cardLayoutRecord.streamingDateStyle
  );

  return (
    <p
      style={{
        color: renderConfig.componentColors.STREAMING_DATE,
        fontFamily: v2_getComponentFontFamily(renderConfig, 'STREAMING_DATE'),
        ...v2_toRenderableStyle(streamingDateLayout),
        ...streamingDateStyle,
        ...v2_getHighlightStyle({
          target: 'cardStreamingDate',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className=" flex justify-center items-center"
    >
      {padZero(date)}
    </p>
  );
};

const CardStreamingDay = ({ dayLabel }: CardStreamingDayProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const streamingDayLayout = renderConfig.layout.card.streamingDay;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const streamingDayStyle = v2_toRenderableStyle(
    cardLayoutRecord.streamingDayStyle
  );

  return (
    <p
      style={{
        color: renderConfig.componentColors.STREAMING_DAY,
        fontFamily: v2_getComponentFontFamily(renderConfig, 'STREAMING_DAY'),
        ...v2_toRenderableStyle(streamingDayLayout),
        ...streamingDayStyle,
        ...v2_getHighlightStyle({
          target: 'cardStreamingDay',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className="absolute flex justify-center items-center"
    >
      {dayLabel}
    </p>
  );
};

const CardStreamingTime = ({ time, isGuerrilla }: CardStreamingTimeProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const streamingTimeLayout = renderConfig.layout.card.streamingTime;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const streamingTimeStyle = v2_toRenderableStyle(
    cardLayoutRecord.streamingTimeStyle
  );

  return (
    <p
      style={{
        color: renderConfig.componentColors.STREAMING_TIME,
        fontFamily: v2_getComponentFontFamily(renderConfig, 'STREAMING_TIME'),
        ...v2_toRenderableStyle(streamingTimeLayout),
        ...streamingTimeStyle,
        ...v2_getHighlightStyle({
          target: 'cardStreamingTime',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ content }: CardMainTitleProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const mainTitleLayout =
    (renderConfig.layout.card.mainTitleContainer as Record<
      string,
      string | number
    >) ?? {};
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const mainTitleWrapperStyle = v2_toRenderableStyle(
    cardLayoutRecord.mainTitleWrapperStyle
  );
  const mainTitleTextStyle = v2_toRenderableStyle(
    cardLayoutRecord.mainTitleTextStyle
  );
  const mainTitleOptions =
    (cardLayoutRecord.mainTitleOptions as Record<string, unknown>) ?? {};
  const mainTitleMaxFontSize =
    typeof mainTitleOptions.maxFontSize === 'number'
      ? mainTitleOptions.maxFontSize
      : renderConfig.maxFontSizes.MAIN_TITLE;
  const mainTitleMultiline =
    typeof mainTitleOptions.multiline === 'boolean'
      ? mainTitleOptions.multiline
      : true;
  const placeholders = createPlaceholdersFromConfig({
    cardInputConfig: renderConfig.cardInputConfig,
  });
  const { widthPercent, ...mainTitleWrapperLayoutRaw } = mainTitleLayout;
  const mainTitleWrapperLayout = v2_toRenderableStyle(mainTitleWrapperLayoutRaw);
  const mainTitleWidth =
    typeof widthPercent === 'number'
      ? `${widthPercent}%`
      : typeof widthPercent === 'string'
        ? widthPercent
        : mainTitleWrapperLayout.width;

  return (
    <div
      style={{
        ...mainTitleWrapperLayout,
        ...(mainTitleWidth !== undefined ? { width: mainTitleWidth } : {}),
        ...mainTitleWrapperStyle,
        ...v2_getHighlightStyle({
          target: 'cardMainTitleContainer',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: v2_getComponentFontFamily(renderConfig, 'MAIN_TITLE'),
          color: renderConfig.componentColors.MAIN_TITLE,
          ...mainTitleTextStyle,
        }}
        className="leading-none text-center"
        multiline={mainTitleMultiline}
        maxFontSize={mainTitleMaxFontSize}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content }: CardSubTitleProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const subTitleLayout =
    (renderConfig.layout.card.subTitleContainer as Record<
      string,
      string | number
    >) ?? {};
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const subTitleTextStyle = v2_toRenderableStyle(
    cardLayoutRecord.subTitleTextStyle
  );
  const subTitleOptions =
    (cardLayoutRecord.subTitleOptions as Record<string, unknown>) ?? {};
  const subTitleMaxFontSize =
    typeof subTitleOptions.maxFontSize === 'number'
      ? subTitleOptions.maxFontSize
      : renderConfig.maxFontSizes.SUB_TITLE;
  const subTitleMultiline =
    typeof subTitleOptions.multiline === 'boolean'
      ? subTitleOptions.multiline
      : true;
  const placeholders = createPlaceholdersFromConfig({
    cardInputConfig: renderConfig.cardInputConfig,
  });
  const { widthPercent, ...subTitleWrapperLayoutRaw } = subTitleLayout;
  const subTitleWrapperLayout = v2_toRenderableStyle(subTitleWrapperLayoutRaw);
  const subTitleWidth =
    typeof widthPercent === 'number'
      ? `${widthPercent}%`
      : typeof widthPercent === 'string'
        ? widthPercent
        : subTitleWrapperLayout.width;

  return (
    <div
      style={{
        ...subTitleWrapperLayout,
        ...(subTitleWidth !== undefined ? { width: subTitleWidth } : {}),
        ...v2_getHighlightStyle({
          target: 'cardSubTitleContainer',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: v2_getComponentFontFamily(renderConfig, 'SUB_TITLE'),
          color: renderConfig.componentColors.SUB_TITLE,
          ...subTitleTextStyle,
        }}
        className="leading-none text-center w-full"
        maxFontSize={subTitleMaxFontSize}
        multiline={subTitleMultiline}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  currentTheme?: TTheme;
}

const OnlineCardBG = ({ currentTheme }: OnlineCardBGProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.online;
  const onlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: 'onlineByTheme',
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ??
    Imgs[currentTheme || 'first']?.online?.src ??
    Imgs.first.online.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={onlineUrl}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.offline;
  const offlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: 'offlineByTheme',
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ??
    Imgs[currentTheme || 'first']?.offline?.src ??
    Imgs.first.offline.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      key={day}
    >
      <img
        src={offlineUrl}
        alt="offline"
        style={{
          ...cardSize,
        }}
      />
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget } =
    useV2TimeTableEditorRuntimeContext();
  const cardSize = renderConfig.cardSizes.online;
  const cardContainerLayout = v2_toRenderableStyle(
    renderConfig.layout.card.container
  );
  const weekdayByOption = weekdays[renderConfig.weekdayOption] ?? weekdays.en;
  const dayLabel = weekdayByOption[time.day] ?? '';

  if (!weekDate) return 'Loading';

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || '09:00';
  const entryMainTitle = (primaryEntry.mainTitle as string) || '';
  const entrySubTitle = (primaryEntry.subTitle as string) || '';

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} currentTheme={currentTheme} />
      ) : (
        <div
          style={{
            ...cardSize,
            ...cardContainerLayout,
            ...v2_getHighlightStyle({
              target: 'cardContainer',
              hoverTarget: hoverHighlightTarget,
              activeTarget: activeHighlightTarget,
            }),
          }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardStreamingDay dayLabel={dayLabel} />
          <CardStreamingDate date={weekDate.getDate()} />
          <CardSubTitle content={entrySubTitle} />
          <CardMainTitle content={entryMainTitle} />
          <CardStreamingTime
            isGuerrilla={Boolean(primaryEntry.isGuerrilla)}
            time={entryTime}
          />

          <OnlineCardBG currentTheme={currentTheme} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
