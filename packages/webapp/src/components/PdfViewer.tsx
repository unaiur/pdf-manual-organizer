import { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { PdfIndexEntry } from '../types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  pdf: PdfIndexEntry;
  scale: number;
  initialPage?: number;
}

export default function PdfViewer({ pdf, scale, initialPage }: PdfViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [numPages, setNumPages] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    
    // Scroll to initial page if provided
    if (initialPage && initialPage > 0 && initialPage <= numPages) {
      setTimeout(() => {
        const pageElement = document.getElementById(`page_${initialPage}`);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  function onDocumentLoadError(error: Error): void {
    setError(error.message);
    setLoading(false);
  }

  const pageScale = isMobile ? Math.min(scale, 1.5) : scale;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          bgcolor: '#f5f5f5',
          p: 2
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load PDF: {error}
          </Alert>
        )}

        <Document
          file={`/pdf/${pdf.path}`}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          options={options}
          loading=""
          error=""
        >
          {numPages && Array.from(new Array(numPages), (_, index) => (
            <Box key={`page_${index + 1}`} id={`page_${index + 1}`} sx={{ mb: 2, boxShadow: 2 }}>
              <Page
                pageNumber={index + 1}
                scale={pageScale}
                renderAnnotationLayer={true}
                renderTextLayer={!isMobile}
                loading=""
                error=""
              />
            </Box>
          ))}
        </Document>
      </Box>
    </Box>
  );
}