# Showup ⚡

> Pokémon team drafting and real-time multiplayer battle platform inspired by Pokémon challenge videos and Pokémon Showdown.

---

## 🎮 Phase 1: Project Architecture & Multiplayer Lobby

This phase establishes the core TypeScript architecture, shared domain models, and authoritative multiplayer lobby system:

- **Monorepo Architecture**: Clean separation between web client (`apps/web`), real-time multiplayer server (`apps/server`), and shared types/utilities (`packages/shared`).
- **Server Authority**: Room state, player joining/leaving, and ready toggles are strictly managed and validated on the server.
- **Typed Socket Contracts**: Full bidirectional event contracts via Socket.IO.
- **Persistent Player Identity**: Client trainers receive an independent session ID (`playerId`) decoupled from ephemeral Socket IDs.
- **Derived Draft Readiness**: Room state automatically derives readiness (`canStartDraft: true`) once 2 trainers have locked in their ready status.

---

## 📁 Project Structure

```text
Showup/
├── apps/
│   ├── web/                     # Next.js 15 + React 19 + Tailwind CSS frontend
│   │   ├── src/
│   │   │   ├── app/             # App router (layout, globals.css, home page)
│   │   │   ├── components/      # LandingView, CreateRoomModal, JoinRoomModal, LobbyView, Header
│   │   │   ├── context/         # GameSocketContext (singleton socket & state)
│   │   │   └── lib/             # Typed Socket.io client & persistent playerId helper
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tailwind.config.ts
│   │
│   └── server/                  # Node.js + TypeScript multiplayer server
│       ├── src/
│       │   ├── index.ts         # HTTP & Socket.IO server entrypoint
│       │   ├── room/            # RoomManager (in-memory authoritative state)
│       │   └── socket/          # Typed socket event handlers (create, join, ready, leave, disconnect)
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                  # Shared TypeScript domain models & contracts
│       ├── src/
│       │   ├── types/           # PokemonBuild, StatSpread, RoomState, BattleAction, Socket events
│       │   ├── constants/       # Default configs, stat spreads, room code rules
│       │   └── utils/           # Room code generator, normalizer, trainer name validator
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                 # npm workspaces root config with concurrent dev script
├── README.md
└── .gitignore
```

---

## 🛠️ How to Install & Run

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+` or `v11+`

### 1. Install Dependencies
Run from the root directory:

```bash
npm install
```

### 2. Run Both Server & Web Client
Start both services in parallel with a single command:

```bash
npm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Multiplayer WebSocket Server
npm run dev:server

# Terminal 2: Next.js Frontend
npm run dev:web
```

### Service URLs
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Multiplayer Server**: [http://localhost:4000](http://localhost:4000) (Health check: [http://localhost:4000/health](http://localhost:4000/health))

---

## 🎯 Features Implemented in Phase 1

1. **Room Creation (`room:create`)**:
   - Generates human-friendly room codes: `PKMN-XXXX` (using unambiguous characters).
   - Configures game mode (`independent` vs `same-pool` draft).
   - Designates creating player as room host.

2. **Room Joining (`room:join`)**:
   - Case-insensitive room code normalization (accepts `x7k2`, `PKMN-X7K2`, etc.).
   - Max 2 players enforcement (3rd player cannot join).
   - Duplicate trainer name validation.
   - Lobby phase validation (cannot join started battles).

3. **Lobby & Ready System (`player:ready`)**:
   - Both players can toggle their ready state independently.
   - Server derives and broadcasts `canStartDraft` when 2 players are connected and ready.

4. **Connection Lifecycle (`disconnect`, `room:leave`)**:
   - Transient disconnects mark player offline without destroying the room.
   - Automatic host reassignment if the original host leaves.
   - Immediate broadcast of disconnected trainer state.

5. **Shared Domain Types Ready for Future Phases**:
   - `PokemonBuild` (evs, ivs, moves, ability, item, nature, teraType, level).
   - `BattleAction` discriminated union (`move`, `switch`).
   - `DraftMode` and `RoomPhase` state machines.
