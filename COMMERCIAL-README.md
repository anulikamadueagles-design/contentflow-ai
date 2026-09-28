# ContentFlow AI 3.2

A developer-ready social media content and AI-video starter application.

## Features

- Social media content generation
- Content repurposing
- Content calendar
- Photo slideshow video creation
- Magic Hour integration
- Pixazo integration
- Async AI video jobs
- Optional OpenAI-compatible AI provider
- Built-in demo mode
- Node.js / Express backend
- Responsive creator dashboard

## AI Content Provider

Configure:

AI_API_URL=
AI_API_KEY=
AI_MODEL=

The endpoint should support an OpenAI-compatible chat-completions request.

If these values are empty, the application uses its built-in demo content engine.

## Video Providers

Magic Hour:

MAGIC_HOUR_API_KEY=

Pixazo:

PIXAZO_API_KEY=
PIXAZO_TEXT_TO_VIDEO_URL=https://api.pixazo.ai/v1/text-to-video
PIXAZO_MODEL=

Never commit API keys to source control.

## Installation

npm install
npm start

Open:

http://localhost:3000

## Production

Set production environment variables through the hosting provider.

Third-party API usage, hosting costs and provider terms are separate from this source package.
