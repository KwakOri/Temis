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

The main data type is defined in `types/supabase.ts`:

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

## 데이터 흐름

```
Component → useQuery/useMutation → Client Service → API Route → Server Service → Supabase
```

**절대 규칙**: 컴포넌트에서 직접 Supabase 클라이언트를 호출하지 말고, 반드시 위 아키텍처를 따라 구현하세요.
