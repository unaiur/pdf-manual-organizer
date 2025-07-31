import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { PdfIndexEntry, TagSection } from '../types';
import { getTagValues } from '../hooks/useIndexData';

interface ManualListProps {
  pdfs: PdfIndexEntry[];
  tagSections: TagSection[];
  selectedTags: Record<string, Set<string>>;
  searchQuery: string;
  onSelectPdf: (pdf: PdfIndexEntry) => void;
  onShowQR: (pdf: PdfIndexEntry) => void;
}

export default function ManualList({ 
  pdfs, 
  tagSections, 
  selectedTags, 
  searchQuery, 
  onSelectPdf, 
  onShowQR 
}: ManualListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Detect iPhone for reduced button height
  const isIPhone = /iPhone/i.test(navigator.userAgent);
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  // Simple filtering logic for debugging
  const filteredPdfs = pdfs.filter((pdf) => {
    // If no search query and no selected tags, show all PDFs
    const hasSearchQuery = searchQuery && searchQuery.trim();
    const hasSelectedTags = Object.values(selectedTags).some(set => set && set.size > 0);
    
    if (!hasSearchQuery && !hasSelectedTags) {
      return true; // Show all PDFs when no filters applied
    }
    
    const values = getTagValues(pdf);
    
    // Check tag filters
    if (hasSelectedTags) {
      for (const section of tagSections) {
        const selected = selectedTags[section.key];
        if (selected && selected instanceof Set && selected.size > 0) {
          if (["brand","model","device","manualType"].includes(section.key)) {
            const tagValue = values[section.key as keyof typeof values];
            if (!tagValue || !selected.has(tagValue)) return false;
          } else {
            const allTags = [...pdf.tags];
            let found = false;
            Array.from(selected).forEach((tag) => {
              if (allTags.includes(`${section.key}=${tag}`) || allTags.includes(tag)) {
                found = true;
              }
            });
            if (!found) return false;
          }
        }
      }
    }
    
    // Check search query
    if (hasSearchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [pdf.filename, ...pdf.tags].join(' ').toLowerCase();
      if (!fields.includes(q)) return false;
    }
    
    return true;
  });

  return (
    <List>
      {filteredPdfs.length === 0 && (
        <ListItem>
          <ListItemText primary="No manuals found." />
        </ListItem>
      )}

      {filteredPdfs.map((pdf) => (
      <ListItem 
        key={pdf.hash} 
        alignItems="flex-start" 
        sx={{ 
          mb: 1, 
          borderRadius: 2, 
          boxShadow: 1, 
          bgcolor: 'background.paper', 
          py: { xs: 1.5, sm: 2 }, 
          flexDirection: { xs: 'column', sm: 'row' } 
        }}
      >
        <Box sx={{ flexGrow: 1, width: '100%' }}>
          {(() => {
            const values = getTagValues(pdf);
            return (
              <Typography variant="subtitle1" fontWeight={600}>
                {values.brand} {values.model} — {values.device} ({values.manualType})
              </Typography>
            );
          })()}
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {pdf.filename}
          </Typography>            
            {(() => {
              // Filter out option tags (starting with !) from display
              const allTags = pdf.tags.filter(tag => !tag.startsWith('!'));
              const isExpanded = expandedTags[pdf.hash] !== undefined ? expandedTags[pdf.hash] : !isMobile;
              const shownTags = isExpanded ? allTags : allTags.slice(0, 2);
              const hasMore = allTags.length > 2;
              
              return (
                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, overflowX: 'visible' }}>
                  {shownTags.map((tag) => (
                    <Box 
                      key={tag} 
                      sx={{ 
                        bgcolor: 'primary.light', 
                        color: 'primary.contrastText', 
                        px: 0.5, 
                        py: 0.2, 
                        borderRadius: 1, 
                        fontSize: 11, 
                        whiteSpace: 'nowrap', 
                        mb: 0.5, 
                        height: 20, 
                        display: 'flex', 
                        alignItems: 'center', 
                        minWidth: 20 
                      }}
                    >
                      {tag}
                    </Box>
                  ))}
                  
                  {hasMore && !isExpanded && (
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label="Show all tags"
                      onClick={() => setExpandedTags((prev) => ({ ...prev, [pdf.hash]: true }))}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' || e.key === ' ') { 
                          setExpandedTags((prev) => ({ ...prev, [pdf.hash]: true })); 
                        } 
                      }}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 1,
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                        border: 'none',
                        cursor: 'pointer',
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 0,
                        outline: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <Box component="span" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }} aria-hidden="true">+</Box>
                    </Box>
                  )}
                  
                  {hasMore && isExpanded && (
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label="Collapse tags"
                      onClick={() => setExpandedTags((prev) => ({ ...prev, [pdf.hash]: false }))}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' || e.key === ' ') { 
                          setExpandedTags((prev) => ({ ...prev, [pdf.hash]: false })); 
                        } 
                      }}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 1,
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                        border: 'none',
                        cursor: 'pointer',
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 0,
                        outline: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <Box component="span" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }} aria-hidden="true">-</Box>
                    </Box>
                  )}
                </Box>
              );
            })()}
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Pages: {pdf.pages} | Last modified: {pdf.lastModified}
            </Typography>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              ml: { xs: 0, sm: 2 },
              mt: { xs: 1.5, sm: 0 },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'center', sm: 'flex-end' },
            }}
          >
            <button
              onClick={() => onSelectPdf(pdf)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <Box
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 2,
                  py: isIPhone ? 0.9 : 1.2,
                  minHeight: isIPhone ? 32 : 44,
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <PictureAsPdfIcon sx={{ mr: 1 }} /> View
              </Box>
            </button>
            
            <button
              onClick={() => onShowQR(pdf)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
              aria-label="Show QR code"
            >
              <Box
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  px: 2,
                  py: isIPhone ? 0.9 : 1.2,
                  minHeight: isIPhone ? 32 : 44,
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': { bgcolor: 'secondary.dark' },
                }}
              >
                <QrCodeIcon sx={{ mr: 1 }} /> QR
              </Box>
            </button>
          </Box>
        </ListItem>
      ))}
    </List>
  );
}
