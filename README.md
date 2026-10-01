<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />
</p>

# 🧠 Zyra — Cybernetic AI Assistant

**Zyra** is a fully local, privacy-first AI assistant with neural voice, autonomous tool calling, live web intelligence, and semantic vector memory — all running on your own hardware. No cloud APIs required.

> Built with Ollama + React + TypeScript. Designed for a single user. Runs entirely offline.

---

## ✨ Features

### 🗣️ Neural Voice Engine
- **British female voice** (`en-GB-SoniaNeural`) via Edge TTS
- Real-time streaming text-to-speech with chunked sentence delivery
- Voice toggle on/off from the UI
- Audio playback queue with graceful stop support

### 💬 Streaming Chat with SSE
- Server-Sent Events for real-time token-by-token LLM streaming
- Thinking/status indicators during multi-step reasoning
- **Stop button** to abort generation and speech mid-stream (`Escape` key support)
- Markdown rendering in message bubbles

### 🔧 Autonomous Tool Calling
Zyra decides when to invoke tools based on natural language — no slash commands needed.

| Tool | Description |
|------|-------------|
| `get_weather` | Live weather conditions for any city worldwide |
| `get_time_or_date` | Current time/date, optionally by timezone or city |
| `search_web` | Real-time internet search via DuckDuckGo |
| `read_webpage` | Fetch and extract readable content from any URL |
| `search_knowledge_base` | Semantic vector search across documents and memory |
| `manage_memory` | Remember personal facts, habits, and preferences |
| `manage_timer` | Set, check, or cancel countdown timers |
| `manage_tasks` | Add, list, or complete to-do items |

Tools are **dynamically injected** — only relevant tool schemas are sent to the LLM based on regex intent matching, eliminating prompt bloat and false-positive calls.

### 🌐 Live Web Intelligence
- **DuckDuckGo Lite search** — POST-based scraping for clean organic results
- **Web page reader** — Extracts readable content from any URL with SSRF protection
- **Citation cards** — Web sources rendered inline with domain badges, titles, and snippets

### 📚 Semantic Vector Memory & Local Document RAG
- **Embedding model**: `nomic-embed-text` (768-dim vectors, runs locally via Ollama)
- **Document ingestion** — Index text, notes, or documents into a local vector store
- **Semantic search** — Cosine similarity retrieval across all indexed content
- **Long-term memory** — Facts and preferences stored as vector embeddings, recalled automatically during conversation (subconscious memory recall at pipeline Node 2)
- **Knowledge Base dashboard** — 3-tab modal UI for document management, ingestion, and live semantic search testing
- **Citation cards** — Knowledge chunks rendered inline with similarity percentages

### 🧩 Skill System
Modular skill architecture with hot-registration:

- **Greeting** — Context-aware greetings
- **Time / Date** — Timezone-aware responses
- **Weather** — Live weather data
- **Alarm / Timer** — Countdown timers
- **Memory** — Persistent fact storage (SQLite-backed)
- **To-Do** — Task management with completion tracking
- **System Info** — Hardware and OS telemetry
- **Music / Control** — Media and system control stubs

### 📊 Pipeline Tracing & Telemetry
- **6-node execution pipeline**: Intent Classification → Subconscious Memory Recall → Skill Routing → Prompt Construction → Tool Execution → Response Synthesis
- Every node timed and traced — full pipeline visibility
- **GPU telemetry** — NVIDIA GPU stats (utilization, VRAM, temperature) via `nvidia-smi`
- **External monitor page** — Standalone HTML dashboard (`/monitor.html`) showing live model stats, pipeline traces, and GPU metrics

### ⏰ Routines & Scheduler
- Cron-based routine scheduler for recurring tasks
- Quick-access routine panel in the UI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  3D Orb  │ │ Chat SSE │ │  Header  │ │ Knowledge UI  │  │
│  │(Three.js)│ │  Stream  │ │ Controls │ │  (RAG Modal)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + SSE
┌────────────────────────▼────────────────────────────────────┐
│                   Express Backend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Orchestrator (6-Node Pipeline)           │   │
│  │  N1: Intent → N2: Memory → N3: Skill → N4: Prompt   │   │
│  │  N5: Tools → N6: Synthesis                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────┐   │
│  │  Tools  │ │ Web Svc  │ │ RAG Svc │ │ Embedding Svc │   │
│  └─────────┘ └──────────┘ └─────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────┐   │
│  │  Voice  │ │ Database │ │Telemetry│ │   Scheduler   │   │
│  │  (TTS)  │ │ (SQLite) │ │  (GPU)  │ │   (Cron)      │   │
│  └─────────┘ └──────────┘ └─────────┘ └───────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │      Ollama (Local LLM)     │
          │  ┌────────┐ ┌────────────┐  │
          │  │llama3.2│ │nomic-embed │  │
          │  │  :3b   │ │   -text    │  │
          │  └────────┘ └────────────┘  │
          └─────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Ollama `llama3.2:3b` (local, 4-bit quantized) |
| **Embeddings** | Ollama `nomic-embed-text` (768-dim, local) |
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | React 18, Vite, TypeScript |
| **3D Visuals** | Three.js (animated AI orb) |
| **Voice** | Edge TTS (`en-GB-SoniaNeural`) |
| **Database** | SQLite (WAL mode) via `better-sqlite3` |
| **Validation** | Zod (env + request schemas) |
| **Icons** | Lucide React |
| **Logging** | Winston |
| **Scheduling** | node-cron |

---

## 📁 Project Structure

```
zyra-agent/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiOrb3D.tsx     # Three.js animated orb
│   │   │   ├── ChatArea.tsx    # Chat input + messages + stop button
│   │   │   ├── Header.tsx      # Top bar with controls
│   │   │   ├── KnowledgeModal.tsx  # RAG document management UI
│   │   │   ├── MessageBubble.tsx   # Message rendering + citations
│   │   │   ├── QuickRoutines.tsx   # Routine shortcuts
│   │   │   └── SkillsDrawer.tsx    # Skill registry viewer
│   │   ├── hooks/
│   │   │   └── useVoice.ts     # TTS audio playback hook
│   │   ├── App.tsx             # Root component + state management
│   │   └── types.ts            # Frontend type definitions
│   └── public/
│       └── monitor.html        # External pipeline monitor
├── src/                        # Backend
│   ├── config/
│   │   ├── index.ts            # Zod-validated env config
│   │   └── logger.ts           # Winston logger
│   ├── core/
│   │   ├── orchestrator.ts     # 6-node execution pipeline
│   │   ├── intent-router.ts    # Intent classification engine
│   │   ├── skill-registry.ts   # Skill hot-registration
│   │   ├── conversation-manager.ts  # Multi-turn context
│   │   ├── pipeline-tracer.ts  # Node timing & tracing
│   │   └── tools.ts            # Tool schemas + execution
│   ├── services/
│   │   ├── database.ts         # SQLite service (WAL mode)
│   │   ├── embedding-service.ts # nomic-embed-text integration
│   │   ├── rag-service.ts      # Vector search + document ingestion
│   │   ├── web-service.ts      # DuckDuckGo search + web scraper
│   │   ├── voice-service.ts    # Edge TTS streaming
│   │   ├── telemetry-service.ts # GPU/system metrics
│   │   ├── scheduler.ts        # Cron-based routines
│   │   └── llm/
│   │       ├── llm-service.ts  # LLM abstraction layer
│   │       ├── ollama-provider.ts  # Ollama integration
│   │       └── claude-provider.ts  # Anthropic fallback
│   ├── skills/                 # Modular skill implementations
│   ├── routes/                 # Express API routes
│   └── types/                  # Shared TypeScript types
├── data/                       # SQLite database files
├── tests/                      # Test suite (121 tests)
└── public/                     # Static assets
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message (SSE streaming response) |
| `GET` | `/api/health` | Health check with system status |
| `GET` | `/api/skills` | List all registered skills |
| `GET` | `/api/routines` | List scheduled routines |
| `POST` | `/api/routines` | Create a new routine |
| `POST` | `/api/voice/tts` | Text-to-speech audio generation |
| `GET` | `/api/memory` | Retrieve stored memories |
| `POST` | `/api/memory` | Store a new memory |
| `GET` | `/api/telemetry` | GPU and system telemetry |
| `GET` | `/api/documents` | List indexed documents |
| `POST` | `/api/documents` | Ingest a new document |
| `DELETE` | `/api/documents/:source` | Remove an indexed document |
| `POST` | `/api/documents/query` | Semantic search across documents |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** (or yarn/pnpm)
- **[Ollama](https://ollama.com)** installed and running
- **NVIDIA GPU** (optional, for GPU telemetry — any GPU works for inference)

### 1. Clone the Repository

```bash
git clone https://github.com/Asifkarim683/zyra-agent.git
cd zyra-agent
```

### 2. Pull Ollama Models

```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### 3. Install Dependencies

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
NODE_ENV=development
LLM_MODE=local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
LOG_LEVEL=info
ASSISTANT_NAME=Zyra
OWNER_NAME=Eren
```

### 5. Start the Application

```bash
# Start Ollama (if not already running)
ollama serve

# Start Zyra backend (in one terminal)
npm run dev

# Start React frontend (in another terminal)
npm run dev:client
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend in dev mode with hot-reload (tsx watch) |
| `npm run dev:client` | Start React frontend dev server (Vite) |
| `npm run build` | Compile TypeScript backend |
| `npm run build:client` | Build React frontend for production |
| `npm run start` | Run compiled backend |
| `npm run test` | Run verification test suite (121 tests) |
| `npm run lint` | ESLint code analysis |

---

## 🧪 Testing

```bash
npm test
```

Runs the full verification suite — **121 tests** covering:
- Configuration validation
- Intent routing accuracy
- Skill registration and execution
- Tool schema validation
- Pipeline tracing
- Database operations
- Embedding and RAG services

---

## 🔒 Privacy & Security

- **100% local inference** — LLM and embeddings run on your machine via Ollama
- **No data leaves your device** — All conversations, memories, and documents stored in local SQLite
- **SSRF protection** — Web scraper blocks requests to private/internal IP ranges
- **System automation disabled** — Desktop control is architecturally stubbed but strictly deactivated

---

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Zyra</b> — Your local, private, cybernetic AI companion.<br/>
  Built with ❤️ by <b>Eren</b>
</p>
