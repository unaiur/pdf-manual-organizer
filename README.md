# PDF Manual Organizer

A web application to manage and search through PDF manuals for home devices.

## Features
- Extract metadata from PDFs (brand, model, device type, manual type)
- Create searchable JSON index with tags
- Allow additional tags via `.tags` files
- Cache previous analyses to avoid reprocessing unchanged files
- Mobile-first web interface for searching and viewing PDFs
- QR code support for linking to specific pages in PDFs
- **Page range hiding**: Hide unwanted pages (covers, ads, etc.) using option tags

## Project Structure
- `indexer/`: PDF processing and indexing tool
- `src/webapp/`: React web application source code
- `pdf/`: PDF storage directory

## Setup and Usage
1. Place PDF manuals in `pdf/` directory
2. Create `.tags` files for additional tags (one tag per line)
   - Regular tags: `brand=LG`, `device=Fridge`, etc.
   - **Option tags** (starting with `!`): Special tags for configuration
     - `!hide-page-range=1-5,25-30,50-`: Hide specific page ranges (pages 1-5, 25-30, and 50 to end)
     - Option tags are processed but hidden from the UI filter display
3. Build the JSON index:

   - Set your OpenAI API key in your environment:
     
     ```sh
     export OPENAI_API_KEY=your-api-key-here
     ```
     
     Optionally, set a custom OpenAI API endpoint (for proxies, Azure, etc):
     
     ```sh
     export OPENAI_API_BASE_URL=https://your-custom-endpoint/v1
     ```
   - Run the indexer tool from the project root:
     
     ```sh
     cd packages/indexer
     npm install
     npm run build-index
     ```
   - This will generate a `pdf/index.json` file with extracted metadata and tags.

   - The indexer will now log all OpenAI requests and responses, as well as the extracted fields for each PDF.
   - LLM extraction results are cached in `pdf/llm-cache.json` and only reprocessed if the PDF file changes (hash changes). To force reprocessing, rename the PDF file.

4. Start web server to access the application

## Page Range Hiding
You can hide unwanted pages from PDF display using option tags in `.tags` files:

```
!hide-page-range=1-5,25-30,50-
```

This example hides:
- Pages 1-5 (cover pages)
- Pages 25-30 (advertisements)  
- Pages 50 to end (appendices)

**Syntax:**
- Single pages: `!hide-page-range=5`
- Page ranges: `!hide-page-range=1-10`
- Open-ended ranges: `!hide-page-range=50-` (from page 50 to end)
- Multiple ranges: `!hide-page-range=1-5,25-30,50-`

Hidden pages are completely removed from the PDF viewer and won't appear in the page navigation. This is especially useful for removing cover pages, advertisements, or irrelevant appendices.
