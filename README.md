<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LiveSync Axiom

Professional-grade audio measurement suite featuring RTA, Transfer Function, Delay Finder, and Signal Generation for system alignment and acoustics analysis.

## Overview
LiveSync Axiom is a high-performance, web-based acoustic measurement platform designed for sound engineers and acoustic consultants. It provides tools for real-time spectral analysis, system alignment, and room acoustics characterization, all within a modern, low-latency interface.

## Key Features
- **Real-Time Analyzer (RTA):** High-resolution spectral analysis with fractional octave smoothing (up to 1/48th).
- **Transfer Function:** Compare reference and measurement channels to analyze Magnitude and Phase response. Includes coherence blanking and manual phase offset.
- **Impulse Response Analysis:** Calculate acoustic metrics including C80 (Clarity), D50 (Definition), and RT60 (Reverberation Time).
- **Auto-Delay Finder:** Automatically calculate the time/distance offset between reference and measurement signals using cross-correlation.
- **Signal Generator:** Internal Pink Noise and Logarithmic Sine Sweep generation.
- **Target Landscape Distance (TLD):** Adjust visual tilt for target curve matching.
- **Session Management:** Export and import measurement sessions for offline analysis.
- **Responsive & Low Latency:** Built with Web Audio API and AudioWorklets for deterministic processing.

## Technical Stack
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Processing:** Web Audio API (AudioWorklet for core DSP)
- **Rendering:** HTML5 Canvas 2D (Optimized for 60 FPS)
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites
- Node.js (v18+)
- A modern web browser with Microphone access

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` | Capture Trace (Snapshot) |
| `Key B` | Toggle Sidebar |
| `Key R` | Reset Analysis/Averaging |
| `Digit 1` | Switch to RTA Tab |
| `Digit 2` | Switch to Transfer Function Tab |
| `Digit 3` | Switch to Impulse Response Tab |
| `Key D` | Run Auto-Delay Finder |
| `Key E` | Generate Correction EQ |
| `Comma` | Toggle Configuration Modal |
| `Key H` | Toggle Knowledge Base |

## Project Structure
- `components/`: UI modules and visualization displays (Canvas-based).
- `services/`: Core audio engines (AudioEngine, GeneratorEngine) and DSP utilities.
- `hooks/`: React hooks for audio system management and acoustic analysis.
- `context/`: Global state management for measurements and traces.
- `types.ts`: Shared TypeScript interfaces and definitions.

---
*Built for precision and portability.*
