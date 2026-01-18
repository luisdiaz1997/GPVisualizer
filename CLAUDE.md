# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Priority: Current Plan

No active plan. See `plans/` directory for past iterations.

---

## Project Overview

GPVisualizer is **both a reusable library and a demo application** for interactive Gaussian Process visualization, built with Vue 3 and Vite.

**Vision**: GPVisualizer is designed as an embeddable tool that can be imported and used in websites, blogs, and educational content. The main application showcases all capabilities of the library.

### As a Library
- Importable GP visualization component(s)
- Core GP computations and utilities
- Canvas rendering logic
- Configurable kernels and parameters
- Future: inducing points, sparse GPs, and more advanced features

### As a Demo Application
- Click to add observation points on a canvas
- See real-time GP posterior visualization
- Experiment with different kernel functions (RBF, Matérn variants)
- Adjust GP parameters (length scale, signal variance, noise level)
- Sample from the GP prior/posterior
- Zoom and pan the canvas view

## Development Commands

**Package Manager**: Bun (alternative to npm)

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Preview production build
bun run preview

# Lint and fix code
bun run lint

# Format code with Prettier
bun run format
```

## Architecture Overview

### Monorepo Structure
The project is organized as a monorepo:
- **`GPzoo.js`** (sibling file) - Core GP library containing all GP-related computations, kernels, and utilities. Framework-agnostic, can be used with any frontend.
- **`GPVisualizer/`** (this directory) - Vue 3 application that uses GPzoo.js as a dependency

### GPzoo.js (`../GPzoo.js`)
**Core GP computations and utilities** - framework-agnostic TypeScript library:

**Structure**:
- `src/utilities.ts` - Matrix and math utilities (Cholesky, solve, linspace, etc.)
- `src/kernels.ts` - Kernel implementations (RBF, Matérn 1/2, 3/2, 5/2)
- `src/gp.ts` - GP computations (posterior, sampling)
- `src/index.ts` - Main entry point with all exports

**Status**: ✅ Implemented with basic GP functionality
- `computePosterior(points, testX, params)` - Compute GP posterior mean and variance
- `sampleFromGP(points, sampleX, params)` - Sample from GP prior/posterior
- `linspace(start, end, n)` - Create evenly spaced arrays
- Matrix operations: `cholesky`, `solveL`, `choleskySolve`, `matMul`, `matVec`, etc.
- Kernels: `rbf`, `matern12`, `matern32`, `matern52`

**Future**: inducing points, sparse approximations, variational inference

### GPVisualizer Application (Vue 3)
**Entry Point**: `src/main.js` - Initializes Vue app with KaTeX directive

**Root Component**: `src/App.vue` - Manages global state and layout

**Components**:
- `GPCanvas.vue` - Canvas visualization with zoom/pan functionality
- `KernelParameters.vue` - Parameter controls and kernel selection
- `ActionsPanel.vue` - Action buttons (random points, sampling, clear)

**Local Utilities** (`src/utils/`):
- `canvasDrawing.js` - Pure canvas drawing functions (grid, confidence band, mean line, samples, points)

**Composables** (`src/composables/`):
- `useViewport.js` - Viewport state and coordinate transformation logic (zoom, pan, bounds management)

### State Management
Uses Vue 3 Composition API with reactive state:
- `points` - User observation points
- `samples` - GP function samples
- `selectedKernel` - Current kernel function
- `params` - GP parameters (length scale, signal variance, noise level)

### Key Features
1. **Interactive Canvas**
   - Click to add points
   - Real-time GP posterior visualization
   - Zoom (mouse wheel) and pan (drag)
   - Double-click to reset view
   - Touch support for mobile (drag and pinch-to-zoom)

2. **Mathematical Implementation**
   - Multiple kernel functions with LaTeX equations
   - Cholesky decomposition for numerical stability
   - Posterior mean and variance calculation
   - GP sampling from prior/posterior

3. **User Interface**
   - Parameter sliders with real-time updates
   - Kernel selection with LaTeX equations
   - Action buttons for random points and sampling
   - Visual legend and point counter

### Build Configuration
- **Vite** with Vue plugin
- **Path aliases**: `@` → `./src`
- **KaTeX** for LaTeX rendering
- **ESLint** + **Prettier** for code quality

## Important Implementation Details

### Modular Architecture
- **`GPzoo.js`**: Framework-agnostic GP library - pure functions, no dependencies. Contains all GP-related code.
- **`useViewport.js`**: Encapsulates viewport state (bounds, zoom level, pan offset) and all interaction handlers (mouse wheel, drag, double-click, touch). Provides coordinate conversion functions (`toCanvasX`, `toCanvasY`, `toDataX`, `toDataY`).
- **`canvasDrawing.js`**: Pure functions for drawing canvas elements (grid, confidence band, mean line, samples, points). No Vue dependencies - just raw Canvas API calls.
- This separation enables easier testing and reusability across different contexts.

### Canvas Coordinates
- Bounds: x ∈ [-3, 3], y ∈ [-2, 2]
- Canvas is responsive and scales to container

### Kernels Supported
- RBF: $k(x, x') = \sigma^2 \exp(-\frac{\|x-x'\|^2}{2\ell^2})$
- Matérn 1/2: $k(x, x') = \sigma^2 \exp(-\frac{|x-x'|}{\ell})$
- Matérn 3/2: $k(x, x') = \sigma^2 (1 + \sqrt{3}r) \exp(-\sqrt{3}r)$
- Matérn 5/2: $k(x, x') = \sigma^2 (1 + \sqrt{5}r + \frac{5r^2}{3}) \exp(-\sqrt{5}r)$

### File Structure Notes
- Both `index.html` (Vue) and `main.html` (vanilla JS) are entry points
- Components use Vue 3 Composition API
- Math utilities are pure functions with JSDoc documentation
- CSS is split into global (`assets/main.css`) and component-specific (`assets/css/components.css`)

## Refactoring Status (January 2025)

### Phase 1: GPzoo.js Library ✅
**Goal**: Extract all GP-related code into a reusable library (GPzoo.js)

- [x] Created GPzoo.js/src/utilities.ts with matrix/math utilities
- [x] Created GPzoo.js/src/kernels.ts with kernel functions (RBF, Matérn variants)
- [x] Created GPzoo.js/src/gp.ts with GP computations (posterior, sampling)
- [x] Created GPzoo.js/src/index.ts with exports
- [x] Updated GPCanvas.vue to import from GPzoo.js

### Phase 2: Pure Visualizer Pattern ✅
**Goal**: Make GPCanvas a pure rendering component with no GP logic

- [x] Moved GP computations from GPCanvas.vue to App.vue
- [x] Removed `defineExpose` - no parent→child method calls
- [x] GPCanvas now receives all data as props (testX, mean, variance, samples)
- [x] Added `@bounds-change` event for viewport synchronization
- [x] Reactive sample clearing via `watch` on `[points, params, kernel]`
- [x] Samples persist during zoom/pan (better UX)
- [x] App.vue now manages: testX computation, posterior calculation, sampling

**Architecture After Refactor**:
```
App.vue
  ├── Manages: points, params, samples, bounds
  ├── Computes: testX, mean, variance (reactive)
  ├── Samples: sampleFromGP() direct call
  └── GPCanvas (pure visualizer)
        ├── Receives: testX, mean, variance, samples as props
        ├── Emits: @bounds-change on viewport change
        └── Renders: all visualization via props
```

### Pending ⏳
- [ ] Remove old GP files from GPVisualizer/src/utils/ (gp.js, gp_utilities.js, kernels.js)
- [ ] Consider monorepo setup (workspace) for easier development

### Import Paths (Current)
```javascript
// GPVisualizer components now use the gpzoo package:
import { computePosterior, sampleFromGP, linspace } from 'gpzoo';
```

### GPzoo.js Package Setup (January 2025)
**Build Process**:
- GPzoo.js has been set up as a proper npm package
- Build script generates 3 distributable formats:
  - `dist/index.mjs` - ESM module
  - `dist/index.cjs` - CommonJS module
  - `dist/index.js` - IIFE for browser
- Package is installed in GPVisualizer as a local dependency: `"gpzoo": "../GPzoo.js"`

**To rebuild GPzoo.js after changes**:
```bash
cd ../GPzoo.js && bun run build
```