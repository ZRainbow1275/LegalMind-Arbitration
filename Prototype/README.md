# LegalMind Arbitration - Intelligent Legal Workbench

LegalMind is a next-generation legal arbitration platform that combines the power of an infinite canvas with advanced AI capabilities to streamline case analysis, evidence management, and virtual hearings.

![LegalMind Workbench](docs/images/workbench-preview.png)

## 🌟 Key Features

### 1. Infinite Legal Canvas
- **Visual Case Analysis**: Organize facts, evidence, and legal issues on an infinite whiteboard.
- **Specialized Nodes**:
  - **Case Node**: Central hub for case information.
  - **Evidence Node**: Manage and link evidence files.
  - **Timeline Node**: Chronological visualization of events.
  - **Legal Issue Node**: Track and analyze legal points.
- **Smart Layout**: Automatic organization of complex graphs using force-directed algorithms.

### 2. AI Intelligence
- **Context Awareness**: The AI understands the spatial relationships and content of your canvas.
- **Smart Suggestions**: Real-time suggestions for legal strategies and evidence connections.
- **Document Analysis**: Automated extraction of key information from uploaded documents.

### 3. Virtual Courtroom
- **Immersive Environment**: specialized interface for conducting virtual hearings.
- **Presentation Mode**: "Broadcast" view for presenting evidence to all participants.
- **Private Channels**: Secure communication channels for lawyer-client discussions.
- **AI Clerk**: Real-time transcription and procedural assistance.

### 4. Real-time Collaboration
- **Multi-user Editing**: Collaborate with colleagues in real-time (Figma-style).
- **Voice Zones**: Spatial audio for natural discussions on the canvas.
- **Comments & Annotations**: Contextual discussions directly on the evidence.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Canvas Engine**: [Plait/Drawnix](https://github.com/plait-board/drawnix) (Open Source Whiteboard Framework)
- **UI Framework**: Tailwind CSS, Shadcn/UI
- **State Management**: Zustand, Jotai
- **Animations**: Framer Motion
- **AI Integration**: Custom AI Service Layer

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ZRainbow1275/LegalMind-Arbitration.git
   cd LegalMind-Arbitration/Prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3001`

## 📁 Project Structure

```
src/
├── components/         # React components
│   ├── common/         # Shared UI components (FloatingPanel, etc.)
│   ├── courtroom/      # Virtual Courtroom specific components
│   ├── nodes/          # Canvas node components
│   └── workspace/      # Core workspace logic
├── hooks/              # Custom React hooks
├── lib/                # Core libraries (Canvas engine, AI service)
├── plugins/            # Plait/Drawnix plugins
├── stores/             # State management (Zustand)
└── utils/              # Helper functions
```

## 🤝 Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

License is not specified (private repository).
