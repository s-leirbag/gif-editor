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
  
export default function InfoModal(props) {
    const [open, setOpen] = React.useState(props.open);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return (
      <Modal
        open={open}
        onClose={handleClose}
        // Stop propagation to FaceCenterer, ImageEditor, and buttons in the background
        onMouseUp={(e) => { e.stopPropagation() }}
      >
        <Box sx={style}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" component="h2">
              Welcome to Gif Editor!
            </Typography>
            <Typography variant="body1" component="p">
                Are you ready to animate some awesome gifs?
                Set a face and gif to begin.
            </Typography>
            <Box>
              <Button variant='outlined' onClick={handleClose} startIcon={<OutputIcon />}>
                Get started!
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }