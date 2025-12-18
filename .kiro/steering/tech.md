# Technology Stack

## Frontend Framework
- **React 19.2.1** with TypeScript 5.8.2
- **Vite 6.2.0** for build tooling and development server
- **JSX**: React JSX transform (no React import needed)

## Key Dependencies
- **@google/genai**: Google Gemini AI integration
- **lucide-react**: Icon library for UI components
- **React DOM 19.2.1**: React rendering

## Build System & Development

### Common Commands
```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
- Create `.env.local` file with `GEMINI_API_KEY`
- API key is exposed to client via Vite's `define` config

## TypeScript Configuration
- **Target**: ES2022 with DOM libraries
- **Module**: ESNext with bundler resolution
- **Path Aliases**: `@/*` maps to workspace root
- **JSX**: React JSX transform
- **Experimental Decorators**: Enabled

## Architecture Patterns
- **Component-based**: Functional React components with hooks
- **Service Layer**: Separate services for auth, drive, and AI operations
- **Type Safety**: Comprehensive TypeScript interfaces and enums
- **State Management**: React useState/useEffect (no external state library)

## Styling
- **CSS**: Custom CSS with CSS variables for theming
- **Design System**: Neon/cyber aesthetic with glass morphism effects
- **Responsive**: Mobile-first approach with Tailwind-like utilities

## Integration Points
- **Google Apps Script**: Document fetching via GOOGLE_SCRIPT_URL
- **Google Sheets**: Data storage via GOOGLE_SHEET_ID
- **Local Storage**: User authentication and preferences