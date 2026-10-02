<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite_WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js_VM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</p>

# 🧠 Zyra — Autonomous Cybernetic Voice Agent & AI Operating Environment

**Zyra** is a local, privacy-first autonomous AI companion and operational voice environment engineered with neural speech synthesis, deterministic conversational parsing, isolated mathematical sandboxing, semantic vector memory, and proactive intelligence synthesis.

> 🔒 **Personal Showcase & Portfolio Project**  
> This repository is maintained as an individual engineering showcase by **Asif Karim ([@Asifkarim683](https://github.com/Asifkarim683))**. It is designed to illustrate full-stack systems architecture, local LLM integration, voice streaming, and defensive agent design. It is presented for exhibition and portfolio code review and is **not intended for cloning, redistribution, or external deployment**.

---

## 🏛️ Engineering Highlights & Core Capabilities

### 1. 🗣️ Universal Conversational Text Interpreter
Unlike standard chatbots that rely entirely on slow, non-deterministic LLM roundtrips for basic conversational commands, Zyra features a **Universal Conversational Text Interpreter** (`ConversationInterpreter`) that delivers `<0.1ms` deterministic intent extraction across all conversational domains:
- **Compound Politeness Stripping**: Recursively removes layered conversational preambles (*"Hey Zyra, could you please tell me..."*, *"Can you kindly..."*, *"I was wondering if you could..."*) down to the exact functional core.
- **Natural Colloquial Phrasing**: Interprets spoken queries like *"what the weather is like in Tokyo right now"* or *"what time it is in Paris"* without requiring rigid syntax.
- **Number-Word Tokenization**: Converts colloquial number words (*"half an hour"*, *"fifteen minutes"*, *"twenty secs"*) into precise programmatic quantities.
- **Multi-Domain Coverage**: Handles Social/Chit-chat (greetings, gratitude, farewells, identity), Alarms & Reminders, Countdown Timers, Tasks/Todos, Live Weather, World Time, Sandboxed Math, System Controls, and Personal Memory facts.

### 2. 🎙️ Neural Voice Engine & Proactive Spoken Briefings
- **British Neural Voice (`en-GB-SoniaNeural`)**: Tailored persona with articulate British English cadence and real-time audio chunking.
- **Proactive Startup Voice Briefing**: Upon launching the application, Zyra synthesizes a clean, spoken intelligence briefing without requiring user text prompting.
- **Dual Voice/Text Pipeline**:
  - `voiceText`: Pure, natural conversational speech crafted without markdown headers, asterisks, URLs, or bracketed citations.
  - `displayText`: Rich markdown cards with live weather metrics, task counts, news headlines, and system telemetry.
- **Scheduled Autonomous Routines**: Cron-managed routines (`0 8 * * *` morning briefing, `0 20 * * *` evening debrief) with pending notification queues.

### 3. 🎵 Inbuilt Music Player (YouTube & Spotify API Support)
- **Universal Multi-Platform Streaming**: Supports seamless search and playback across both **YouTube** and **Spotify** right inside the cybernetic interface.
- **Dual API & Zero-Config Architecture**:
  - **YouTube Integration**: Connects via official YouTube Data API v3 (`YOUTUBE_API_KEY`) or an ultra-fast zero-config parser to resolve official music videos, channel art, and embed streams without API keys.
  - **Spotify Integration**: Connects via official Spotify Web API (`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`) using Client Credentials flow, with fallback to Spotify oEmbed metadata resolution.
- **Floating Dock & Full Studio Drawer**:
  - **Docked Mini-Bar**: Low-profile player with spinning vinyl album art, track details, platform tags, play/pause toggles, and volume control.
  - **Full Music Studio**: Live YouTube and Spotify embedded player, instant search bar, platform toggles, and one-click ambient presets (*Lofi Chill*, *Synthwave Radio*, *Cyberpunk 2077*, *Coffee Shop Jazz*, *Classical Focus*).
- **Conversational Voice Control**: Responds directly to spoken or typed commands (*"play Bohemian Rhapsody on youtube"*, *"play some jazz on spotify"*, *"pause music"*, *"resume music"*, *"next song"*, *"stop music"*).

### 4. ⚡ Safe Mathematical & Code Execution Sandbox
- **Host-Isolated `node:vm` Container**: Eliminates hallucinated calculations by executing mathematical, statistical, and algorithmic queries inside a hardened execution sandbox.
- **Built-in Computational Libraries**:
  - **Statistics**: `avg()`, `median()`, `sum()`, `min()`, `max()`, `stdDev()`, `variance()`, `factorial()`, `combinations()`, `permutations()`
  - **Finance**: `compoundInterest()`, `loanPayment()` (monthly EMI calculations)
  - **Date Arithmetic**: `daysBetween()`, `hoursBetween()`, `addDays()`
  - **Dimensional Unit Conversions**: `unitConvert()` across metric/imperial lengths, masses, temperatures, and digital storage.
- **Defensive Safeguards**: Strict 1500ms timeout protection, infinite loop termination, and AST/token blacklisting against host access (`process`, `require`, `fs`, `eval`).

### 5. 🧠 Subconscious Semantic Memory & Local Document RAG
- **Zero-Latency Memory Fast-Path**: Parses facts, profile updates, and preferences (`FactInterpreter`) and writes them directly to local SQLite in WAL mode.
- **Subconscious Vector Memory Recall**: Node 2 of the pipeline automatically computes 768-dimensional vector embeddings (`nomic-embed-text`) to recall relevant long-term memories before formulating responses.
- **Local Document RAG**: Complete document ingestion pipeline allowing indexing and cosine-similarity retrieval over personal reference materials.

### 6. 🌐 Live Web Intelligence & Real-Time Weather
- **Scraped Web Search**: Autonomous DuckDuckGo Lite integration for real-time fact retrieval without commercial API keys.
- **Clean Article Extraction**: In-memory HTML parser for extracting readable content from remote web pages.
- **Open-Meteo Geocoding**: Real-time worldwide weather and temperature monitoring with phonetic city name resolution fallbacks.

### 7. 🛡️ Defensive Security & Hardening
- **Loopback & Private SSRF Defense**: Comprehensive CIDR and IP validation blocking access to `127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`, and cloud metadata endpoints (`169.254.169.254`).
- **Strict OS Protection**: Desktop application execution is architecturally isolated and disabled to ensure host integrity.
- **Zod Schema Contracts**: All REST endpoints and environment configurations are validated at compile and runtime.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 Frontend UI                            │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  3D Audio Orb  │  │ Real-Time SSE    │  │ Knowledge Base Modal   │  │
│  │   (Three.js)   │  │ Streaming Chat   │  │ & Memory Inspector     │  │
│  └────────────────┘  └──────────────────┘  └────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Server-Sent Events (SSE)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Express & TypeScript Backend                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │           Universal Conversational Text Interpreter              │  │
│  │   (Preamble Stripping • Entity Extraction • Intent Mapping)      │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                 ┌───────────────────┴───────────────────┐              │
│                 ▼                                       ▼              │
│  ┌─────────────────────────────┐         ┌──────────────────────────┐  │
│  │ Deterministic Skill Engine  │         │ 6-Node Traced Pipeline   │  │
│  │ (< 0.1ms Fast-Path Response)│         │ (Local LLM Orchestrator) │  │
│  └──────────────┬──────────────┘         └────────────┬─────────────┘  │
│                 │                                     │                │
│                 ▼                                     ▼                │
│  ┌─────────────────────────────┐         ┌──────────────────────────┐  │
│  │ Isolated Math Sandbox (VM)  │         │ Subconscious Memory RAG  │  │
│  │ Proactive Voice Briefings   │         │ Dynamic Tool Calling     │  │
│  │ SQLite WAL Database Service │         │ Local Ollama (llama3.2)  │  │
│  └─────────────────────────────┘         └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 6-Node Traced Execution Pipeline

Every user interaction traverses an instrumented, telemetry-tracked processing pipeline:

```
[User Utterance]
       │
       ▼
 [Node 1: Intent Classification]  ──> Deterministic regex & conversational interpreter
       │
       ▼
 [Node 2: Subconscious Memory]    ──> Vector cosine-similarity retrieval (nomic-embed-text)
       │
       ▼
 [Node 3: Skill Fast-Path]        ──> Immediate execution if intent is deterministic
       │
       ▼
 [Node 4: Contextual Prompting]   ──> System prompt + history + memories + dynamic tools
       │
       ▼
 [Node 5: Autonomous Tool Loop]   ──> Weather, Search, Web Reader, Sandbox, Timers
       │
       ▼
 [Node 6: Response Synthesis]     ──> British English persona formatting + SSE Stream
```

---

## 💻 Tech Stack & System Specifications

| Domain | Technology | Purpose |
|---|---|---|
| **Language** | TypeScript (ESNext) | Full-stack end-to-end type safety |
| **Backend Core** | Node.js 20+, Express | RESTful API and Server-Sent Events (SSE) streaming |
| **Sandbox Execution**| `node:vm` Context Isolation | High-precision arithmetic and code execution sandbox |
| **Frontend Framework**| React 18, Vite | Component architecture and state management |
| **3D Cybernetic Graphics**| Three.js, Canvas | Audio-reactive, interactive 3D orb visualization |
| **Neural Voice Engine** | Edge TTS (`en-GB-SoniaNeural`)| Real-time streaming British speech delivery |
| **Local LLM Inference** | Ollama (`llama3.2:3b`) | Offline, local neural reasoning and tool calling |
| **Vector Embeddings** | Ollama (`nomic-embed-text`) | 768-dimensional local vector space embeddings |
| **Relational & WAL Store**| SQLite (`better-sqlite3`) | Persistent memory, tasks, routines, and telemetry |
| **Validation & Security**| Zod, Custom SSRF Guard | Strict runtime schema enforcement and network defense |
| **Styling & Icons** | Tailwind CSS, Lucide React | Cybernetic dark-mode terminal interface |

---

## 🧪 Automated Verification Suite

The repository includes a comprehensive end-to-end verification test harness (`tests/verify.ts`) executing **190 automated tests with 0 failures**:

```bash
========================================
Test Results: 190 passed, 0 failed
========================================
```

Test coverage includes:
- **Conversational Parsing**: Preamble stripping, compound politeness phrases, word-number resolution, and entity extraction.
- **Skill Engine**: Intent routing accuracy across all skills (Greeting, Memory, Weather, Time, Timers, Alarms, Tasks, Control, System Info).
- **Inbuilt Music Engine**: YouTube & Spotify API resolution, zero-config scrapers & oEmbed fallbacks, queue management, and playback state machine.
- **Math Sandbox**: Arithmetic, statistical distributions, compound interest formulas, date calculations, unit conversions, infinite-loop timeouts, and token blocking.
- **Proactive Briefings**: Dual voice/text generation, clean audio formatting, pending notification state, and acknowledgment lifecycle.
- **Security & SSRF Guards**: Loopback, CIDR, private IP, and cloud metadata blocking.
- **Database & WAL Persistence**: SQLite multi-process concurrency, schema integrity, and vector recall.

---

## 🔒 Showcase Notice & Portfolio Statement

This project was conceived, designed, and implemented as a personal exploration into autonomous AI agent architecture, neural voice interfaces, and high-performance local computing.

- **Author**: Asif Karim ([@Asifkarim683](https://github.com/Asifkarim683))
- **Environment**: Developed and tuned for personal hardware with local GPU inference.
- **Distribution Notice**: All code is shared for portfolio demonstration only. External redistribution, cloning, or public hosting is not authorized.

<p align="center">
  <b>Zyra</b> — Engineering Showcase by <b>Asif Karim</b>
</p>
