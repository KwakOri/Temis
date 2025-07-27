# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.3 React application called "Temis" with dual functionality:
1. **Timetable Editor**: Creates weekly schedules with customizable themes and PNG export
2. **Template Management System**: Admin-controlled template access and user management with authentication

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Setup

### Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=*** # Required: Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=*** # Required: Supabase anonymous key

# Authentication
JWT_SECRET=*** # Required: Secret key for JWT token signing

# Admin Configuration  
ADMIN_EMAILS=*** # Required: Comma-separated admin email addresses
```

### Database Setup
- Supabase project ID: `***` (check environment or Supabase dashboard)
- Generate fresh types: `supabase gen types typescript --project-id <PROJECT_ID>`
- Main schema files: `/src/types/database.ts` (manual), `/src/types/supabase-generated.ts` (auto)

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
- **Supabase**: Database backend with PostgreSQL
- **@supabase/supabase-js**: Supabase client for database operations

## Authentication & Database

### Database Schema
```sql
-- Users table
users: id (number), email (string|null), name (string|null), password (string|null), created_at, updated_at

-- Templates table  
templates: id (string), name (string), description (string|null), thumbnail_url (string|null), 
          is_public (boolean|null), created_at, updated_at

-- Template Access table
template_access: id (string), template_id (string), user_id (number), 
                access_level (string|null), granted_by (string|null), granted_at (string|null)
```

### Authentication System
- **JWT-based authentication** with HTTP-only cookies
- **Admin management** via email whitelist in environment variables
- **Protected routes** using middleware and ProtectedRoute components
- **Role-based access control** with template permissions

### Type Definitions
- Main types in `/src/types/database.ts` (manually maintained)
- Auto-generated types in `/src/types/supabase-generated.ts` (via Supabase CLI)
- Use `supabase gen types typescript --project-id ajlgjdwkjyayrnocdfpj` to regenerate types

## API Routes Structure

### Authentication APIs (`/api/auth/`)
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify current session

### Admin APIs (`/api/admin/`) - Requires admin privileges
- `GET /api/admin/users` - List all users with pagination
- `GET /api/admin/templates` - Manage templates
- `GET /api/admin/template-access` - Manage template permissions
- `GET /api/admin/user-templates` - Get user's template list

### User APIs (`/api/user/`)
- `GET /api/user/templates` - Get current user's accessible templates

## Page Structure

### Public Pages
- `/` - Homepage with conditional login/logout buttons
- `/auth` - Login/Register forms
- `/templates/sample` - Timetable editor (original functionality)

### Protected Pages  
- `/my-page` - User's template dashboard
- `/admin` - Admin dashboard (admin-only)

### Admin Dashboard Features
- **User Management**: View all users, user details modal, permission management
- **Template Management**: CRUD operations on templates
- **Access Management**: Grant/revoke template access permissions

## Development Notes

### Type Safety
- All user data fields handle null values gracefully  
- Use `String(user.id)` for ID conversions when needed
- Database IDs are numbers, but JWT userId can be string|number

### Component Patterns
- Use client components (`"use client"`) for interactive features
- Prefer existing app-specific components over shared components
- Implement proper loading states and error handling

### Database Operations
- Always use `Number()` conversion for user_id in database queries
- Handle nullable fields in UI with fallback values
- Use Supabase relationships for joined queries

### Security
- Admin emails configured via `ADMIN_EMAILS` environment variable
- All admin APIs require authentication + admin permission check
- Template access controlled via template_access table

## Recent Implementation Summary

### Completed Features (Latest Session)
1. **Database Schema Synchronization**
   - Updated local types to match Supabase schema changes
   - Fixed user ID type mismatches (string vs number)
   - Removed content/created_by columns from templates table

2. **Admin Dashboard Enhancements**
   - User Management with user details modal and permission management modal
   - Template Management with streamlined UI (removed creator fields)
   - Access Management with card-based template selection (improved from dropdown)

3. **Homepage Authentication State**
   - Dynamic login/logout buttons based on authentication status
   - Admin users get additional "관리자 페이지" button
   - Real-time authentication status checking

4. **My-Page Template Dashboard**
   - User's accessible templates displayed in responsive grid
   - Template cards with thumbnails, permissions, and metadata
   - Access level badges (읽기/편집/관리자) with color coding
   - Integration of user permissions + public templates

### Key Architectural Decisions
- Client components for dynamic authentication states
- Null-safe data handling throughout the application
- Type-safe API integration with proper error handling
- Responsive design with Tailwind CSS
- Modular component architecture with reusable patterns

### Git Branch Status
- Current branch: `feature/auth`
- Main implementation files modified during session
- Ready for deployment with complete authentication system
