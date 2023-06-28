import React from 'react';

import { sampleGifs, sampleFaces } from '../Constants.js';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';

import UploadFileIcon from "@mui/icons-material/UploadFile";

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

export default function UploadButton(props) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const openButton = (
    <Button
      component="label"
      variant="outlined"
      startIcon={<UploadFileIcon />}
      onClick={handleOpen}
      disabled={props.disabled}
    >
      <Typography variant="h6">{props.text}</Typography>
    </Button>
  );

  const multiple = props.type === 'gif' || props.type === 'overlay';
  const uploadButton = (
    <Button
      component="label"
      variant="outlined"
      startIcon={<UploadFileIcon />}
      onClick={handleOpen}
      sx={props.type === 'overlay' ? {} : { width: '100%', height: '100%' }}
    >
      <Typography variant="h6">Upload</Typography>
      <input type="file" accept="image/*" multiple={multiple} hidden
        onChange={(e) => {
          handleClose();
          props.onUpload(e);
        }}
      />
    </Button>
  );

  const renderSample = (name) => {
    return (
      <Grid item xs={3} key={name}>
        <Button variant='outlined' sx={{ p: 0, width: '100%', height: '100%' }}
          onClick={() => {
            handleClose();
            props.onPickSample(name);
          }}
        >
          <Box
            component='img'
            src={props.type === 'gif' ? 'sample_gifs/' + name + '/gif.gif' : 'sample_faces/' + name + '.png'}
            alt={name}
            loading='lazy'
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Button>
      </Grid>
    );
  };

  let instructions = '';
  let body = '';
  if (props.type === 'overlay') {
    body = uploadButton;
  }
  else {
    instructions = `Upload a ${props.type} or select a sample ${props.type}`;
    const samples = (props.type === 'gif' ? sampleGifs : sampleFaces).map((name, index) => renderSample(name));
    body = (
      <Grid container spacing={2} sx={{ mt: -1, height: '100%', overflow: 'auto' }}>
        <Grid item xs={3} key={'upload'}>
          {uploadButton}
        </Grid>
        {samples}
      </Grid>
    );
  }

  const size = {
    width: props.type === 'overlay' ? 'auto' : '70vw',
    height: props.type === 'overlay' ? 'auto' : '70vh',
  }

  return (
    <div>
      {openButton}
      <Modal
        open={open}
        onClose={handleClose}
        // Stop propagation to FaceCenterer and ImageEditor
        onMouseUp={(e) => { e.stopPropagation() }}
      >
        <Box sx={{ ...style, ...size }}>
          <Box sx={{ height: props.type === 'face' ? 'auto' : '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" component="h2">{props.text}</Typography>
            <Typography variant='h6'>{instructions}</Typography>
            {body}
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
