
# Deployment Guide - KMRCL Metro Intelligence

## 1. Prerequisites

You need a **Google Gemini API Key**. Get it from [Google AI Studio](https://aistudio.google.com/).

## 2. Deploy to Vercel (Recommended)

This application is built with Vite and React, making it perfect for Vercel.

1.  **Push Code to GitHub**:
    *   Initialize a git repo: `git init`
    *   Add files: `git add .`
    *   Commit: `git commit -m "Initial commit"`
    *   Push to a new repository on GitHub.

2.  **Import to Vercel**:
    *   Go to [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click **"Add New Project"** -> **"Import"** (select your GitHub repo).

3.  **Configure Environment Variables**:
    *   In the Vercel Project Settings, find **"Environment Variables"**.
    *   Add `VITE_GEMINI_API_KEY` with your API key value.
    *   (Optional) Add `VITE_APP_SCRIPT_URL` if you have the Google Apps Script backend set up.

4.  **Deploy**:
    *   Click **Deploy**. Vercel will automatically detect the Vite build settings (`npm run build`).

## 3. Deploy to Render

1.  Create a new **Static Site** on Render.
2.  Connect your GitHub repository.
3.  **Build Command**: `npm run build`
4.  **Publish Directory**: `dist`
5.  **Environment Variables**: Add `VITE_GEMINI_API_KEY` in the Render Dashboard under "Environment".

## 4. Can I deploy directly from AI Studio?

**No.** Google AI Studio is a prototyping environment. While you can preview code there, you cannot "deploy" a permanent web application directly from it. You must export the code (copy-paste it) to a local folder or a GitHub repository and then use a hosting provider like Vercel, Netlify, or Render as described above.

## 5. Export Formats

The application now supports exporting schematics as:
*   **SVG**: Best for vector editing.
*   **PNG/JPEG**: High-resolution raster images for reports.
*   **JSON**: Raw data of components for inventory.
*   **PDF**: For PDF, simply print the page (Ctrl+P) and select "Save as PDF", or export as PNG first and insert into a document.
