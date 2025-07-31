# AGENTS.md

## Build, Lint, and Test Commands

- **Webapp**
  - Build: `cd packages/webapp && npm run build`
  - Start: `cd packages/webapp && npm start`
  - Test all: `cd packages/webapp && npm test`
  - Test single file: `cd packages/webapp && npm test -- src/FILENAME.test.tsx`
- **Indexer**
  - Build index: `cd packages/indexer && npm run build-index`
  - (No tests defined)

## Code Style Guidelines

- **Language:** TypeScript (strict mode enabled)
- **Imports:** Use ES6 imports; prefer absolute imports if configured, otherwise use relative.
- **Formatting:** Follow default Prettier/VSCode settings (2 spaces, semicolons, single quotes allowed).
- **Types:** Always type function arguments and return values. Avoid `any`.
- **Naming:** Use camelCase for variables/functions, PascalCase for types/components, UPPER_CASE for constants.
- **Error Handling:** Use try/catch for async code; log errors with context.
- **React:** Use function components and hooks. Place CSS in separate files.
- **Testing:** Use React Testing Library and Jest. Place tests alongside source files.
- **Other:** Keep code modular and avoid large files. Document complex logic with comments.

## Technical Implementation Notes

### PDF Viewer Memory Optimization
The PDF viewer uses react-window virtualization to handle large documents efficiently:
- Only renders pages visible in the viewport plus 1 overscan page
- Significantly reduces memory usage on mobile devices
- Prevents out-of-memory crashes with large PDF files
- Maintains smooth scrolling performance
- Page hiding feature works seamlessly with virtualization by filtering the visible pages array

### PDF Viewer Zoom System
The PDF viewer implements an accurate zoom system using actual PDF dimensions:

**Core Architecture:**
- Gets real PDF dimensions using `pdf.getPage(1)` and `page.getViewport({ scale: 1 })`
- Calculates exact scale factors based on available container space vs actual PDF dimensions
- Uses `viewport.height * scale` for precise react-window itemSize calculation

**Three Zoom Modes:**
- **Fit Width**: `scale = availableWidth / viewport.width` - fills horizontal space, variable page height
- **Fit Height**: `scale = availableHeight / viewport.height` - fills vertical space, fixed page height
- **Manual**: User-controlled scale with 1.2x increments (zoom in/out buttons)

**Key Features:**
- Auto-selects zoom mode when opening PDFs based on viewport aspect ratio
- Zoom controls integrated into AppBar with visual indication of active mode
- Eliminates spacing issues by using actual PDF viewport dimensions instead of theoretical constants
- react-window itemSize = `(viewport.height * currentScale) + padding` for exact sizing
- Responsive design that works across mobile and desktop

**Implementation Details:**
- PDF dimensions detected asynchronously on document load
- Scale factors recalculated when container size changes
- Manual zoom range: 0.1x to 5.0x with 1.2x increment steps
- Minimal padding: 8px mobile, 16px desktop
- No hardcoded PDF dimensions - all calculations based on actual file properties

**iPhone Zoom Optimization:**
- Maximum zoom limited to 300% (3x) on iPhone devices to prevent memory issues and performance degradation
- Desktop and other devices support up to 1000% (10x) zoom
- Zoom controls automatically disable and show visual feedback when maximum is reached
- This prevents PDF viewer failures and slowdowns at high zoom levels on memory-constrained iOS devices

---

If you add linting or formatting configs, update this file accordingly.
