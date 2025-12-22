<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

[![Build Status](https://github.com/SHASHIYA06/KMRCL-Intelligence-tools/workflows/🚀%20CI/CD%20Pipeline/badge.svg)](https://github.com/SHASHIYA06/KMRCL-Intelligence-tools/actions)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.1-blue?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

</div>

# KMRCL Metro Intelligence 🚇

A cutting-edge AI-powered document analysis and intelligence platform built for Kolkata Metro Rail Corporation Limited (KMRCL). This React-based application provides metro engineers with intelligent document search, analysis, and AI-assisted workflows.

## ✨ Features

- **🤖 AI-Powered Analysis**: Google Gemini integration for advanced document understanding
- **📄 Multi-Format Support**: PDF, DOCX, XLSX file processing with intelligent insights
- **🎯 Intelligence Hub**: Multi-mode AI chat (Engineering, General, Email, Letter drafting)
- **☁️ Google Drive Integration**: Seamless document management and synchronization
- **🎤 Voice Agent**: Voice-controlled document selection and analysis
- **🔐 Role-Based Access**: Admin and User roles with granular permissions
- **⚡ Circuit Analysis**: Specialized engineering circuit component extraction
- **🎨 Modern UI**: Glassmorphism design with neon aesthetics and smooth animations

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SHASHIYA06/KMRCL-Intelligence-tools.git
   cd KMRCL-Intelligence-tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🌐 Live Demo

🔗 **Production URL**: [Coming Soon - Deploy to Vercel]
🔗 **Repository**: https://github.com/SHASHIYA06/KMRCL-Intelligence-tools

### Default Login Credentials
- **Admin Access Code**: `9799494321`
- **Demo User**: Use the signup form to create a user account

## 🛠️ Build & Deploy

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
The application is optimized for Vercel deployment. Simply connect your GitHub repository to Vercel and it will automatically deploy.

## 🏗️ Tech Stack

- **Frontend**: React 19.2.1 + TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS + Custom CSS with Glassmorphism
- **AI Integration**: Google Gemini AI (@google/genai)
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)

## 📁 Project Structure

```
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main application shell
│   ├── VoiceAgent.tsx  # Voice interaction interface
│   └── ...
├── pages/              # Application views
│   ├── Dashboard.tsx   # Admin overview
│   ├── IntelligenceHub.tsx # AI chat interface
│   └── ...
├── services/           # Business logic & API integrations
│   ├── authService.ts  # Authentication
│   ├── geminiService.ts # AI model communication
│   └── ...
├── .kiro/steering/     # AI assistant guidance rules
└── styles.css          # Global styles & animations
```

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `GOOGLE_SCRIPT_URL`: Custom Google Apps Script URL (optional)
- `GOOGLE_SHEET_ID`: Google Sheets ID for data storage (optional)

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Neon color palette (Blue: #00f3ff, Purple: #bc13fe, Green: #00ff9d)
- Custom animations (blob, pulse-glow, float, scan)
- Glassmorphism utilities
- Responsive breakpoints

## 🎨 Design System

### Colors
- **Primary**: Neon Blue (#00f3ff)
- **Secondary**: Neon Purple (#bc13fe)
- **Accent**: Neon Green (#00ff9d)
- **Background**: Dark Blue (#050b14)
- **Glass**: rgba(17, 25, 40, 0.6) with backdrop blur

### Typography
- **Primary**: Inter (300-800 weights)
- **Monospace**: JetBrains Mono

## 🔐 Authentication

The application supports two user roles:
- **Admin**: Full access to all features including user management
- **User**: Limited access based on assigned permissions

Default admin credentials:
- Access Code: `9799494321`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for KMRCL. All rights reserved.

## 👨‍💻 Developer

**Shashi Shekhar Mishra**
- GitHub: [@SHASHIYA06](https://github.com/SHASHIYA06)

---

<div align="center">
  <p>Built with ❤️ for KMRCL Metro Engineering Team</p>
</div>
