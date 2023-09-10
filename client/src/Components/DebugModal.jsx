import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';

import OutputIcon from '@mui/icons-material/Output';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

/**
 * Modal for debugging purposes
 * Currently for outputting gif properties when making new sample gifs and their property presets
 */
export default function DebugModal(props) {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    React.useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, []);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape')
        handleOpen();
    };

    return (
      <Modal
        open={open}
        onClose={handleClose}
        // Stop propagation to FaceCenterer and ImageEditor
        onMouseUp={(e) => { e.stopPropagation() }}
      >
        <Box sx={style}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" component="h2">
              Debug
            </Typography>
            <Button variant='outlined' onClick={props.onOutputProperties} startIcon={<OutputIcon />}>
              Output Gif Properties
            </Button>
          </Box>
        </Box>
      </Modal>
    );
  }