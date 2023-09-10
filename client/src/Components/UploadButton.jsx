import React from 'react';

import InfoModal from './InfoModal';
import { sampleGifs, sampleFaces } from '../Constants.js';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack'
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

  let openButton = '';
  if (props.type === 'overlay') {
    openButton = (
      <IconButton
        component="label"
        variant="outlined"
        color='primary'
        sx={{ borderRadius: 100 }}
        onClick={handleOpen}
        disabled={props.disabled}
      >
        <UploadFileIcon />
      </IconButton>
    );
  }
  else {
    openButton = (
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
  }

  const renderInfoModal = () => {
    if (props.type === 'overlay')
      return '';
    
    let infoModalText = '';
    const imgStyle = { height: '90%', objectFit: 'contain' };
    const renderInfoImage = (name, src) => {
      return (
        <Stack direction="column" alignItems="center" sx={{ height: '100%' }} key={name}>
          <Typography variant="h5" component="h5" align='center'>{name}</Typography>
          <img src={src} alt={src} style={imgStyle} />
        </Stack>
      );
    };
    const renderInstruction = (description, buttons) => {
      return (
        <Stack direction="column" alignItems="center" sx={{ m: 2 }} key={description}>
          <Typography variant="h6" component="h6" align='center'>{description}</Typography>
          <img src='icons8-arrow-100.png' alt='arrow' />
          {buttons.map((button) => (
            <Button variant='outlined' sx={{ p: 1, width: '15vw', height: '100%' }} href={button.url} target="_blank" rel="noopener" key={button.src}>
              <img src={button.src} alt={button.src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Button>
          ))}
        </Stack>
      );
    }
    if (props.type === 'face') {
      infoModalText = {
        title: 'How to Prepare a Face Image',
        body: (
          <Box sx={{ mt: 2, mb: 2, height: 'calc(70vh - 192px)', display: 'flex', alignItems: 'center', overflow: 'auto' }}>
            {renderInfoImage('Original Image', 'the_rock1.jpeg')}
            {renderInstruction('Remove Background', [{ url: 'https://remove.bg/', src: 'removebg.png' }])}
            {renderInfoImage('Background Removed', 'the_rock2removebg.png')}
            {renderInstruction('Erase Body', [{ url: 'https://krita.org/', src: 'krita.jpeg' }, { url: 'https://www.getpaint.net/', src: 'paint.net.png' }])}
            {renderInfoImage('Head Cutout', 'the_rock3no_body.png')}
            {renderInstruction('Shrink Image (for speed)', [{ url: 'https://www.simpleimageresizer.com/', src: 'simpleimageresizer.png' }])}
            {renderInfoImage('Shrunk', 'the_rock4resize.png')}
          </Box>
        ),
        button: 'Got it!',
      }
    }
    else if (props.type === 'gif') {
      infoModalText = {
        title: 'How to Prepare a Gif',
        body: (
          <Box sx={{ mt: 2, mb: 2, height: 'calc(70vh - 192px)', display: 'flex', alignItems: 'center', overflow: 'auto' }}>
            {renderInfoImage('Original Gif', 'dwight1.gif')}
            {renderInstruction('Shrink, Crop, Cut (recommended)', [{ url: 'https://ezgif.com/resize', src: 'ezgif.png' }])}
            {renderInfoImage('Shrunk & Cropped', 'dwight2ro.gif')}
            {renderInstruction('Split Frames (required)', [{ url: 'https://ezgif.com/split', src: 'ezgif.png' }])}
            {renderInfoImage('Frames Split', 'dwight3split.jpeg')}
            {renderInstruction('Erase Face (optional)', [{ url: 'https://krita.org/', src: 'krita.jpeg' }, { url: 'https://www.getpaint.net/', src: 'paint.net.png' }])}
            {renderInfoImage('Face Erased', 'dwight4hole.gif')}
          </Box>
        ),
        button: 'Got it!',
      }
    }
    return <InfoModal hasButton width='70vw' height='70vh' {...infoModalText}/>;
  }

  const multiple = props.type === 'gif' || props.type === 'overlay';
  const infoModal = renderInfoModal();
  const uploadButton = (
    <div style={props.type === 'overlay' ? {} : { width: '100%', height: '100%' }}>
      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        onClick={handleOpen}
        sx={{ width: '100%', height: '100%' }}
      >
        <Typography variant="h6">Upload</Typography>
        <input type="file" accept="image/*" multiple={multiple} hidden
          onChange={(e) => {
            handleClose();
            props.onUpload(e);
          }}
        />
      </Button>
      {infoModal}
    </div>
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
    if (props.type === 'face') {
      instructions = (
        <Typography variant='h6'>
          Upload a face or select a sample face (use PNG for transparency)
        </Typography>
      );
    }
    else if (props.type === 'gif') {
      instructions = (
        <Typography variant='h6'>
          Upload gif frames or select a sample gif
        </Typography>
      );
    }
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
    width: props.type === 'overlay' ? 'auto' : '80vw',
    height: props.type === 'overlay' ? 'auto' : '80vh',
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
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" component="h2">{props.text}</Typography>
            {instructions}
            {body}
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
