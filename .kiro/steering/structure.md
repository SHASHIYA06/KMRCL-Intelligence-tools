# Project Structure

## Root Level Files
- **index.html**: Entry HTML file with critical CSS and loading states
- **vite.config.ts**: Vite build configuration with PostCSS and Tailwind
- **tailwind.config.js**: Tailwind CSS configuration with custom theme
- **postcss.config.js**: PostCSS configuration for CSS processing
- **package.json**: Dependencies and build scripts

## Source Directory (`/src`)
- **App.tsx**: Main application component with routing and state management
- **index.tsx**: React app entry point with ErrorBoundary wrapper
- **index.css**: Main stylesheet with Tailwind imports and custom styles
- **types.ts**: Comprehensive TypeScript type definitions
- **constants.ts**: Application constants, API URLs, and configuration

## Folder Organization

### `/src/components`
Reusable UI components following single responsibility principle:
- **Layout.tsx**: Main application shell with sidebar navigation
- **ErrorBoundary.tsx**: Error handling wrapper component
- **VoiceAgent.tsx**: Voice interaction interface
- **CircuitViewer.tsx**: Engineering circuit visualization
- **ThreeDCard.tsx**: 3D card animations and effects

### `/src/pages`
Top-level application views corresponding to navigation tabs:
- **Dashboard.tsx**: Admin overview and system metrics
- **DriveBrowser.tsx**: Google Drive file management interface
- **IntelligenceHub.tsx**: Multi-mode AI chat interface
- **DocAnalysis.tsx**: Document processing and analysis
- **Settings.tsx**: User preferences and system configuration
- **Login.tsx**: Authentication interface

### `/src/services`
Business logic and external API integrations:
- **authService.ts**: User authentication and role management
- **driveService.ts**: Google Drive API interactions
- **geminiService.ts**: AI model communication and processing

## Code Organization Patterns

### Component Structure
```typescript
// Standard functional component pattern
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // State hooks first
  const [state, setState] = useState();
  
  // Effect hooks second
  useEffect(() => {}, []);
  
  // Event handlers
  const handleEvent = () => {};
  
  // Render logic
  return <div>...</div>;
};
```

### CSS Architecture
- **Tailwind Layers**: Base, Components, Utilities structure
- **CSS Variables**: Custom properties for theming
- **Glassmorphism**: Backdrop blur effects with transparency
- **Neon Aesthetics**: Custom glow effects and gradient text

### Type Definitions
- **Interfaces**: Use for object shapes and component props
- **Enums**: Use for fixed sets of values (FileType, UserRole)
- **Union Types**: Use for string literals and variants

### File Naming
- **Components**: PascalCase (Layout.tsx, VoiceAgent.tsx)
- **Services**: camelCase with Service suffix (authService.ts)
- **Types**: Descriptive interfaces (User, DriveFile, ChatMessage)

### Import Organization
1. React imports first
2. Third-party libraries
3. Local components and services (using @ alias)
4. Type imports last