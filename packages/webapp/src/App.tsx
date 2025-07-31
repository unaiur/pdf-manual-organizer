import React, { useEffect, useState } from 'react';
import './App.css';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme, alpha, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';

interface PdfIndexEntry {
  path: string;
  filename: string;
  hash: string;
  title: string;
  brand: string;
  model: string;
  device: string;
  manualType: string;
  tags: string[];
  extraTags: string[];
  pages: number;
  lastModified: string;
}

interface IndexData {
  generatedAt: string;
  pdfs: PdfIndexEntry[];
}

function App() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Track the currently opened PDF (null = none open)
  const [selectedPdf, setSelectedPdf] = useState<PdfIndexEntry | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetch('/index.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load index.json');
        return res.json();
      })
      .then((data) => {
        setIndex(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const drawerWidth = 240;

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Tag filtering state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Compute unique tags from index
  const allTags = React.useMemo(() => {
    if (!index) return [];
    const tagSet = new Set<string>();
    index.pdfs.forEach((pdf) => {
      pdf.tags.forEach((t) => tagSet.add(t));
      pdf.extraTags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [index]);

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    if (isMobile) handleDrawerToggle();
  };

  // Styled search bar
  const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(2),
      width: 'auto',
    },
  }));

  const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }));

  const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    '& .MuiInputBase-input': {
      padding: theme.spacing(1, 1, 1, 0),
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      transition: theme.transitions.create('width'),
      width: '100%',
      [theme.breakpoints.up('sm')]: {
        width: '20ch',
        '&:focus': {
          width: '28ch',
        },
      },
    },
  }));

  const drawer = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <List>
        <ListItem>
          <ListItemText primary="Filter by tag" />
        </ListItem>
        {allTags.length === 0 && (
          <ListItem>
            <ListItemText primary="No tags found" />
          </ListItem>
        )}
         {allTags.map((tag) => (
          <ListItemButton
            key={tag}
            selected={selectedTag === tag}
            onClick={() => handleTagClick(tag)}
          >
            <ListItemText primary={tag} />
          </ListItemButton>
        ))}      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar always shown, but will add close button in next step */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && !selectedPdf && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Manuals Library
          </Typography>
          {selectedPdf ? (
            <IconButton
              color="inherit"
              aria-label="close pdf"
              edge="end"
              onClick={() => setSelectedPdf(null)}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          ) : (
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search manuals…"
                inputProps={{ 'aria-label': 'search' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: isMobile ? 120 : 200 }}
              />
            </Search>
          )}
        </Toolbar>
      </AppBar>
      {/* Hide Drawer when PDF is open */}
      {!selectedPdf && (
        <nav>
          <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? drawerOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
              display: { xs: 'block', sm: 'block' },
            }}
          >
            {drawer}
          </Drawer>
        </nav>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: !selectedPdf ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
          mt: 8,
        }}
      >
        {selectedPdf ? (
          // PDF viewer mode
          <Box sx={{ width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
  {selectedPdf.brand} {selectedPdf.model} — {selectedPdf.device} ({selectedPdf.manualType})
</Typography>
<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
  {selectedPdf.filename}
</Typography>
            <iframe
              src={`/pdf/${selectedPdf.path}`}
              title={selectedPdf.title || selectedPdf.filename}
              style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
            />
          </Box>
        ) : (
          // Main page mode
          <>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {index && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Loaded {index.pdfs.length} manuals.
                  {selectedTag && (
                    <span style={{ marginLeft: 8 }}>
                      (Filtered by tag: <b>{selectedTag}</b>)
                    </span>
                  )}
                  {searchQuery && (
                    <span style={{ marginLeft: 8 }}>
                      (Search: <b>{searchQuery}</b>)
                    </span>
                  )}
                </Alert>
                <List>
                  {index.pdfs
                    .filter((pdf) => {
                      // Tag filter
                      if (selectedTag && ![...pdf.tags, ...pdf.extraTags].includes(selectedTag)) {
                        return false;
                      }
                      // Search filter (case-insensitive, matches filename, title, brand, model, device, manualType, tags)
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        const fields = [
                          pdf.filename,
                          pdf.title,
                          pdf.brand,
                          pdf.model,
                          pdf.device,
                          pdf.manualType,
                          ...pdf.tags,
                          ...pdf.extraTags,
                        ].join(' ').toLowerCase();
                        if (!fields.includes(q)) return false;
                      }
                      return true;
                    })
                    .map((pdf) => (
                      <ListItem key={pdf.hash} alignItems="flex-start" sx={{ mb: 1, borderRadius: 2, boxShadow: 1, bgcolor: 'background.paper', py: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ flexGrow: 1 }}>
<Typography variant="subtitle1" fontWeight={600}>
  {pdf.brand} {pdf.model} — {pdf.device} ({pdf.manualType})
</Typography>
<Typography variant="body2" color="text.secondary">
  {pdf.filename}
</Typography>                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: { xs: 'nowrap', sm: 'wrap' }, gap: 0.5, overflowX: { xs: 'auto', sm: 'visible' } }}>
                            {[...pdf.tags, ...pdf.extraTags].map((tag) => (
                              <Box key={tag} sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', px: 1, borderRadius: 1, fontSize: 12, whiteSpace: 'nowrap' }}>
                                {tag}
                              </Box>
                            ))}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Pages: {pdf.pages} | Last modified: {pdf.lastModified}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 2, alignSelf: 'center' }}>
                          <button
                            onClick={() => setSelectedPdf(pdf)}
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
                                py: 1.2,
                                minHeight: 44,
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
                              View PDF
                            </Box>
                          </button>
                        </Box>
                      </ListItem>
                    ))}
                  {index.pdfs.filter((pdf) => {
                    if (selectedTag && ![...pdf.tags, ...pdf.extraTags].includes(selectedTag)) {
                      return false;
                    }
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const fields = [
                        pdf.filename,
                        pdf.title,
                        pdf.brand,
                        pdf.model,
                        pdf.device,
                        pdf.manualType,
                        ...pdf.tags,
                        ...pdf.extraTags,
                      ].join(' ').toLowerCase();
                      if (!fields.includes(q)) return false;
                    }
                    return true;
                  }).length === 0 && (
                    <ListItem>
                      <ListItemText primary="No manuals found." />
                    </ListItem>
                  )}
                </List>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export default App;
