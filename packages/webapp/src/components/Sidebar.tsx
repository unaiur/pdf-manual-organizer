import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { TagSection } from '../types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  tagSections: TagSection[];
  selectedTags: Record<string, Set<string>>;
  onTagClick: (sectionKey: string, tag: string) => void;
  onClearAllTags: () => void;
  isMobile: boolean;
}

const drawerWidth = 240;

export default function Sidebar({ 
  open, 
  onClose, 
  tagSections, 
  selectedTags, 
  onTagClick, 
  onClearAllTags,
  isMobile 
}: SidebarProps) {
  const drawer = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <List>
        <ListItem disableGutters sx={{ mb: 1 }}>
          <Box sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'cyan.main',
            color: 'cyan.contrastText',
            fontWeight: 'bold',
            fontSize: 18,
            px: 2,
            py: 1.2,
            borderRadius: 2,
            boxShadow: 1,
            letterSpacing: 0.5,
            justifyContent: 'space-between',
          }}>
            <span style={{ flex: 1, textAlign: 'center' }}>Filter by tag</span>
            {Object.keys(selectedTags).some((section) => selectedTags[section]?.size > 0) && (
              <Tooltip title="Clear all tag filters">
                <IconButton
                  size="small"
                  sx={{ color: 'cyan.contrastText', ml: 1 }}
                  onClick={onClearAllTags}
                  aria-label="Clear all tag filters"
                >
                  <FilterAltOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </ListItem>
        
        {tagSections.length === 0 && (
          <ListItem>
            <ListItemText primary="No tags found" />
          </ListItem>
        )}
        
        {tagSections.map((section, idx) => (
          <Accordion key={section.key} defaultExpanded={idx === 0}>
            <AccordionSummary
              expandIcon={<span>▼</span>}
              aria-controls={`panel-${section.key}-content`}
              id={`panel-${section.key}-header`}
            >
              <Typography sx={{ fontWeight: 600 }}>
                {(() => {
                  const keyMap: Record<string, string> = {
                    manualType: 'Manual Type',
                    brand: 'Brand',
                    model: 'Model',
                    device: 'Device',
                    other: 'Other',
                  };
                  return keyMap[section.key] || section.key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
                })()}
                {selectedTags[section.key] && selectedTags[section.key].size > 0 && (
                  <span style={{ marginLeft: 8, color: '#888', fontWeight: 400 }}>
                    ({selectedTags[section.key].size} selected)
                  </span>
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {section.tags.map((tag) => (
                <ListItemButton
                  key={tag}
                  selected={selectedTags[section.key]?.has(tag)}
                  onClick={() => onTagClick(section.key, tag)}
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary={tag} />
                </ListItemButton>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </List>
    </Box>
  );

  return (
    <nav>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? open : true}
        onClose={onClose}
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
  );
}