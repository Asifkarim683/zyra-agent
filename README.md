# Zyra Assistant

Zyra Assistant is a Node.js + TypeScript personal AI assistant capable of interacting using Claude API and local LLMs via Ollama.

## Architecture

Zyra uses a clean architecture approach, separating concerns into distinct layers:
- Configuration is handled through environment variables.
- AI abstraction allows seamless switching between cloud and local LLMs.
- APIs are exposed via Express, validated with Zod.

## Prerequisites

- Node.js 20+
- npm (or yarn/pnpm)
- [Ollama](https://ollama.com) (if running local models)

## Setup Instructions

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to add your `ANTHROPIC_API_KEY` and update other configurations.
4. Run the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: Start the application in development mode with watch using tsx.
- `npm run build`: Compile the TypeScript code to JavaScript.
- `npm run start`: Run the compiled application.
- `npm run lint`: Run ESLint to check for code issues.
