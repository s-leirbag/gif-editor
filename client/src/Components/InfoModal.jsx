import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import InfoIcon from '@mui/icons-material/Info';
import OutputIcon from '@mui/icons-material/Output';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};
  
export default function InfoModal(props) {
  const [open, setOpen] = React.useState(props.startOpen);
  const handleOpen = () => setOpen(true);
  const handleClose = () => { setOpen(false); if (props.onClose) props.onClose(); }

  let button = '';
  if (props.hasButton) {
    if (props.buttonBackground) {
      button = (
        <div style={{ width: '100%', height: '100%'}}>
          <Paper sx={{ borderRadius: 100, float: 'right', transform: 'translate(0, -100%)' }} elevation={4}>
            <IconButton onClick={handleOpen}>
              <InfoIcon />
            </IconButton>
          </Paper>
        </div>
      );
    }
    else {
      button = (
        <div style={{ width: '100%', height: '100%'}}>
          <IconButton onClick={handleOpen} sx={{ float: 'right', transform: 'translate(0, -100%)' }}>
            <InfoIcon />
          </IconButton>
        </div>
      );
    }
  }

  return (
    <div>
      {button}
      <Modal
        open={open}
        onClose={handleClose}
        // Stop propagation to FaceCenterer, ImageEditor, and buttons in the background
        onMouseUp={(e) => { e.stopPropagation() }}
      >
        <Box sx={{...style, width: props.width || 400 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" component="h2">{props.title}</Typography>
            {props.body}
            <Box>
              <Button variant='outlined' onClick={handleClose} startIcon={<OutputIcon />}>
                {props.button}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}