# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.3 React application called "Temis" that creates a timetable editor and preview system. The application allows users to create weekly schedules with customizable themes and export them as PNG images.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

### Key Components Structure

The app follows a modular component architecture with two main directory patterns:

1. **App Router Components** (`src/app/test/_components/`):

   - Main timetable editor logic and state management
   - Handles image export functionality using html-to-image library

2. **Shared Components** (`src/components/TimeTableEditor/`):
   - Reusable UI components for controls and forms

### Core Functionality

**TimeTableEditor** (`src/app/test/_components/TimeTableEditor.tsx`):

- Main component managing timetable state and user interactions
- Handles date calculations (automatic Monday detection)
- Manages scale, data array for 7 days, and profile image upload
- Exports timetable as 1280x720 PNG using html-to-image library

**TimeTablePreview** (`src/app/test/_components/TimeTablePreview/`):

- Renders the visual timetable with customizable themes (blue/pink/yellow)
- Fixed 1280x720 canvas with scalable preview
- Uses static background images and profile image overlay

### Data Structure

The main data type is defined in `types.ts`:

```typescript
interface Data {
  day: number; // 0-6 (Mon-Sun)
  isOffline: boolean;
  time: string; // Format: "HH:MM"
  description: string; // Max 7 characters per line
}
```

### Theme System

The app supports multiple color themes (blue, pink, yellow) with corresponding image assets in `src/app/test/_img/[theme]/`:

- `bg.png` - Background image
- `week.png` - Week header flag
- `online.png`, `offline.png` - Status indicators
- `profile.png` - Default profile image

### Font Assets

Custom Korean font "ongeulip.ttf" is stored in `src/app/test/_font/` for consistent typography.

## Key Dependencies

- **html-to-image**: Used for exporting timetable as PNG images
- **Tailwind CSS v4**: Styling framework
- **TypeScript**: Type safety throughout the application

## Development Notes

- The main timetable functionality is currently in `/test` route
- Component duplication exists between `src/app/test/_components/` and `src/components/` - prefer the app-specific components for timetable functionality
- Date handling automatically calculates Monday-based weeks
- Image export generates fixed 1280x720 resolution regardless of preview scale

/sc:implement /Users/kwakori/projects/promotion/temis/src/components/TimeTable/FixedComponents/TimeTableInputList.tsx 이 파일에서는 input 세트에 대한 데이터를 props로 입력받아서 시간표 작성에 사용할 input list를 생성하고 있어.

현재 각 요일에 대한 데이터는
export interface TDynamicCard {
isOffline: boolean;
offlineMemo?: string;
[key: string]:
| string
| number
| boolean
| Array<{ text: string; checked: boolean }>
| undefined;
}

위와 같은 타입으로 /Users/kwakori/projects/promotion/temis/src/types/time-table/data.ts에 정의되어 있어. 그래서 time, title, description같은 데이터들이 동적으로 할당되고 있어.
그런데 나는 한 요일에 두 번 이상의 방송이 있을 경우 한 요일에 두 개 이상의 방송 데이터를 넣고 싶어.
그래서 기존 type을

export interface TEntry {
[key: string]:
| string
| number
| boolean
| Array<{ text: string; checked: boolean }>
| undefined;}

export interface TDynamicCard {
isOffline: boolean;
offlineMemo?: string;
entries: TEntry[]
}

이런 방식으로 바꿔서 하루에 두 개 이상의 데이터가 저장될 수 있도록 만들고 싶어.
위 작업은 전체 코드에 영향을 미칠 수 있지만, 앞으로의 프로젝트 확장성을 위해서는 피할 수 없는 작업이라고 봐.

위 작업에 맞춰서, /Users/kwakori/projects/promotion/temis/src/components/TimeTable/FixedComponents/TimeTableInputList.tsx 에서 요일마다 인풋 세트 개수를 추가할 수 있는 버튼을 만들고, 요일마다 여러 개의 인풋 세트를 렌더링할 수 있도록 로직을 변경해줘. 그리고 /Users/kwakori/projects/promotion/temis/src/contexts 폴더에 있는 contexts와 /Users/kwakori/projects/promotion/temis/src/hooks에 있는 hook들도 살펴보고 관련 부분들을 반영해서 코드를 변경해줘. 주로 수정해야 할 로직은 데이터 저장, 추가, 삭제, 변경 등이고 localStorage에 저장하고 불러오는 로직도 고려해줘.
