<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite_WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js_VM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</p>

# 🧠 Zyra — Autonomous Cybernetic Voice Agent & AI Operating Environment

**Zyra** is a local, privacy-first autonomous AI companion and operational voice environment engineered with neural speech synthesis, deterministic conversational parsing, universal typo-tolerant spell healing, an in-chat dynamic music player, isolated mathematical sandboxing, semantic vector memory, and proactive intelligence synthesis.

> 🔒 **Personal Showcase & Portfolio Project**  
> This repository is maintained as an individual engineering showcase by **Asif Karim ([@Asifkarim683](https://github.com/Asifkarim683))**. It is designed to demonstrate full-stack systems architecture, local LLM integration, voice streaming, defensive agent design, and resilient intent orchestration. It is presented strictly for portfolio exhibition and code review and is **not intended for downloading, cloning, redistribution, or external deployment**.

---

## 🏛️ Engineering Highlights & Core Capabilities

### 1. 🔤 Universal Typo & Spell Healing Engine (`TypoCorrector`)
Unlike brittle keyword parsers that break on small typing mistakes, Zyra features an integrated, cross-model **Universal Typo Corrector** combining $O(1)$ dictionary lookups with bounded **Damerau-Levenshtein distance matching** across all domains:
- **Zero-Latency Command Normalization**: Instantly corrects typos in common action verbs, entities, platform targets, and question preambles (*"weathr"*, *"alrm"*, *"remnd"*, *"ad tast"*, *"tiem"*, *"paws"*, *"stoop"*, *"breif"*, *"calulate"*).
- **Strict First-Letter Matching Guard**: Bounded fuzzy matching requires matching the initial character (`lower[0] === target[0]`), preventing cross-word phonetic leaps (e.g. *"kindly"* is never corrupted to *"windy"*, and *"right"* is never corrupted to *"night"*).
- **Protected Functional Vocabulary & Prose Preservation**: Standard English functional words (*"in"*, *"on"*, *"at"*, *"to"*, *"for"*, *"right"*, *"well"*, *"call"*, *"tell"*) are protected from fuzzy mutation, ensuring casual conversation, creative writing, and named entities remain 100% intact.
- **Deep Model Pipeline Integration**: Instrumentally integrated across the Ingestion Node (`node_ingest`), Intent Router (`IntentRouter`), Conversation Interpreter (`ConversationInterpreter`), and Dynamic LLM Tool Gating (`getToolsForPrompt`).

### 2. 🎵 Dynamic In-Chat Music Player (YouTube & Spotify Support)
- **Interactive In-Bubble Card**: Replaced cumbersome fixed banners with a lightweight, dynamic interactive widget directly inside the conversation stream.
- **Live State Synchronization & Controls**: Features real-time play/pause toggles, track duration, platform badges, spinning album art, and an audio-reactive animated waveform equalizer.
- **Dual API & Zero-Config Architecture**:
  - **YouTube Integration**: Connects via official YouTube Data API v3 or an ultra-fast zero-config scraper to stream official videos, channel art, and audio streams.
  - **Spotify Integration**: Connects via official Spotify Web API with Client Credentials flow, DuckDuckGo fallback resolvers, and high-accuracy iTunes metadata resolution.
- **Autocorrect Typo Bridge**: Resolves misspelled tracks (*"blnding lights"*, *"starby the weeknd"*) by dynamically bridging through search engine autocorrection, preventing accidental fallbacks to default songs.
- **Continuous Background Audio Stream**: Seamlessly links an authentic background YouTube audio stream for Spotify tracks so the browser plays continuous full audio through speakers while presenting authentic Spotify artwork and metadata.
- **Concise Spoken Title Synthesis**: Speaks only the clean, short song title and artist without repetitive query echoing or messy video clutter (*"Now playing 'Blinding Lights' by The Weeknd on Spotify"*).

### 3. 🗣️ Universal Conversational Text Interpreter
Delivers `<0.1ms` deterministic intent extraction across all conversational domains:
- **Compound Politeness Stripping**: Recursively removes layered conversational preambles (*"Hey Zyra, could you please tell me..."*, *"Can you kindly..."*, *"I was wondering if you could..."*) down to the exact functional core.
- **Natural Colloquial Phrasing**: Interprets spoken queries like *"what the weather is like in Tokyo right now"* or *"what time it is in Paris"* without requiring rigid syntax.
- **Number-Word Tokenization**: Converts colloquial number words (*"half an hour"*, *"fifteen minutes"*, *"twenty secs"*) into precise programmatic quantities.
- **Multi-Domain Coverage**: Handles Social/Chit-chat (greetings, gratitude, farewells, identity), Alarms & Reminders, Countdown Timers, Tasks/Todos, Live Weather, World Time, Sandboxed Math, System Controls, and Personal Memory facts.

### 4. 🎙️ Neural Voice Engine & Proactive Spoken Briefings
- **British Neural Voice (`en-GB-SoniaNeural`)**: Tailored persona with articulate British English cadence and real-time audio chunking.
- **Proactive Startup Voice Briefing**: Upon launching the application, Zyra synthesizes a clean, spoken intelligence briefing without requiring user text prompting.
- **Dual Voice/Text Pipeline**:
  - `voiceText`: Pure, natural conversational speech crafted without markdown headers, asterisks, URLs, or bracketed citations.
  - `displayText`: Rich markdown cards with live weather metrics, task counts, news headlines, and system telemetry.
- **Scheduled Autonomous Routines**: Cron-managed routines (`0 8 * * *` morning briefing, `0 20 * * *` evening debrief) with pending notification queues.

### 5. ⚡ Safe Mathematical & Code Execution Sandbox
- **Host-Isolated `node:vm` Container**: Eliminates hallucinated calculations by executing mathematical, statistical, and algorithmic queries inside a hardened execution sandbox.
- **Built-in Computational Libraries**:
  - **Statistics**: `avg()`, `median()`, `sum()`, `min()`, `max()`, `stdDev()`, `variance()`, `factorial()`, `combinations()`, `permutations()`
  - **Finance**: `compoundInterest()`, `loanPayment()` (monthly EMI calculations)
  - **Date Arithmetic**: `daysBetween()`, `hoursBetween()`, `addDays()`
  - **Dimensional Unit Conversions**: `unitConvert()` across metric/imperial lengths, masses, temperatures, and digital storage.
- **Defensive Safeguards**: Strict 1500ms timeout protection, infinite loop termination, and AST/token blacklisting against host access (`process`, `require`, `fs`, `eval`).

### 6. 🧠 Subconscious Semantic Memory & Local Document RAG
- **Zero-Latency Memory Fast-Path**: Parses facts, profile updates, and preferences (`FactInterpreter`) and writes them directly to local SQLite in WAL mode.
- **Subconscious Vector Memory Recall**: Node 2 of the pipeline automatically computes 768-dimensional vector embeddings (`nomic-embed-text`) to recall relevant long-term memories before formulating responses.
- **Local Document RAG**: Complete document ingestion pipeline allowing indexing and cosine-similarity retrieval over personal reference materials.

### 7. 🌐 Live Web Intelligence & Real-Time Weather
- **Scraped Web Search**: Autonomous DuckDuckGo Lite integration for real-time fact retrieval without commercial API keys.
- **Clean Article Extraction**: In-memory HTML parser for extracting readable content from remote web pages.
- **Open-Meteo Geocoding**: Real-time worldwide weather and temperature monitoring with phonetic city name resolution fallbacks.

### 8. 🛡️ Defensive Security & Hardening
- **Loopback & Private SSRF Defense**: Comprehensive CIDR and IP validation blocking access to `127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`, and cloud metadata endpoints (`169.254.169.254`).
- **Strict OS Protection**: Desktop application execution is architecturally isolated and disabled to ensure host integrity.
- **Zod Schema Contracts**: All REST endpoints and environment configurations are validated at compile and runtime.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 Frontend UI                            │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  3D Audio Orb  │  │ Real-Time SSE    │  │ Interactive In-Chat    │  │
│  │   (Three.js)   │  │ Streaming Chat   │  │ Music Player Widget    │  │
│  └────────────────┘  └──────────────────┘  └────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Server-Sent Events (SSE)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Express & TypeScript Backend                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │       Universal TypoCorrector & Conversational Interpreter       │  │
│  │   (Spell Healing • Preamble Stripping • Semantic Extraction)     │  │
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
│  │ In-Chat Music Player Engine │         │ Subconscious Memory RAG  │  │
│  │ Isolated Math Sandbox (VM)  │         │ Dynamic Tool Calling     │  │
│  │ Proactive Voice Briefings   │         │ Local Ollama (llama3.2)  │  │
│  │ SQLite WAL Database Service │         │ YouTube Autocorrect Link │  │
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
 [Node 1: Ingestion & Typo Healing]  ──> Bounded Damerau-Levenshtein & dictionary normalization
       │
       ▼
 [Node 2: Subconscious Memory]       ──> Vector cosine-similarity retrieval (nomic-embed-text)
       │
       ▼
 [Node 3: Skill Fast-Path]           ──> Immediate execution if intent is deterministic
       │
       ▼
 [Node 4: Contextual Prompting]      ──> System prompt + history + memories + dynamic tools
       │
       ▼
 [Node 5: Autonomous Tool Loop]      ──> Music, Weather, Search, Web Reader, Sandbox, Timers
       │
       ▼
 [Node 6: Response Synthesis]        ──> British English persona formatting + SSE Stream
```

---

## 💻 Tech Stack & System Specifications

| Domain | Technology | Purpose |
|---|---|---|
| **Language** | TypeScript (ESNext) | Full-stack end-to-end type safety |
| **Backend Core** | Node.js 20+, Express | RESTful API and Server-Sent Events (SSE) streaming |
| **Typo & Spell Engine** | Damerau-Levenshtein | Bounded algorithmic typo healing across all skills |
| **Music Streaming** | YouTube & Spotify APIs | In-chat dynamic player with background audio bridge |
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

The repository includes a comprehensive end-to-end verification test harness (`tests/verify.ts`) executing **231 automated tests with 0 failures**:

```bash
========================================
Test Results: 231 passed, 0 failed
========================================
```

Test coverage includes:
- **Universal TypoCorrector**: Bounded fuzzy distance healing (*"weathr"*, *"alrm"*, *"rember"*, *"breif"*, *"calulate"*, *"tiem"*, *"paws"*, *"ad tast"*), first-letter protection, and prose preservation.
- **Conversational Parsing**: Preamble stripping, compound politeness phrases, word-number resolution, and entity extraction.
- **Skill Engine**: Intent routing accuracy across all skills (Greeting, Memory, Weather, Time, Timers, Alarms, Tasks, Control, System Info).
- **Inbuilt Music Engine**: In-chat interactive player, YouTube & Spotify API resolution, YouTube autocorrect typo bridge, clean title synthesis, queue management, and playback state machine.
- **Math Sandbox**: Arithmetic, statistical distributions, compound interest formulas, date calculations, unit conversions, infinite-loop timeouts, and token blocking.
- **Proactive Briefings**: Dual voice/text generation, clean audio formatting, pending notification state, and acknowledgment lifecycle.
- **Security & SSRF Guards**: Loopback, CIDR, private IP, and cloud metadata blocking.
- **Database & WAL Persistence**: SQLite multi-process concurrency, schema integrity, and vector recall.

---

## 🔒 Showcase Notice & Portfolio Statement

This project was conceived, designed, and implemented as a personal exploration into autonomous AI agent architecture, neural voice interfaces, and high-performance local computing.

- **Author**: Asif Karim ([@Asifkarim683](https://github.com/Asifkarim683))
- **Environment**: Developed and tuned for personal hardware with local GPU inference.
- **Distribution Notice**: All code is shared for portfolio demonstration only. External downloading, redistribution, cloning, or public hosting is not authorized.

<p align="center">
  <b>Zyra</b> — Engineering Showcase by <b>Asif Karim</b>
</p>
