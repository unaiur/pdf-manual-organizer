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

---

If you add linting or formatting configs, update this file accordingly.
