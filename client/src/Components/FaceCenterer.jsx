import React from 'react';
import './FaceCenterer.css'

import { PositionInput } from './Input.jsx';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from "@mui/icons-material/UploadFile";

export default class FaceCenterer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenSize: null,
      screenPos: null,
    };
    this.imgRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener('resize', this.getScreenSizePos);
  }
  
  componentWillUnmount() {
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener('resize', this.getScreenSizePos);
  }

  handleMouseUp = (e) => {
    const coord = { x: e.clientX, y: e.clientY };
    if (this.isInBounds(coord)) {
      // Calculate new center

      // center to face center
      const screenCenter = this.state.screenCenter;
      let c2fc = { x: coord.x - screenCenter.x, y: coord.y - screenCenter.y };
      // scale from screen to actual pixels
      c2fc = this.sizeScreenToActual(c2fc);
      // add to actual center then round
      const center = this.getCenter(this.props.size);
      let newPos = this.addVectors(center, c2fc);
      newPos = { x: Math.round(newPos.x), y: Math.round(newPos.y) };

      this.props.onCenterChange(newPos);
    }
  }

  getCenter = ({ width, height }) => {
    return { x: width / 2, y: height / 2 };
  }
  
  addVectors = (vec1, vec2) => {
    return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
  }
  
  subtractVectors = (vec1, vec2) => {
    return { x: vec1.x - vec2.x, y: vec1.y - vec2.y };
  }

  isInBounds({x, y}) {
    const screenPos = this.state.screenPos;
    const screenSize = this.state.screenSize;
    return (
      x >= screenPos.x && x <= screenPos.x + screenSize.width &&
      y >= screenPos.y && y <= screenPos.y + screenSize.height
    );
  }

  sizeActualToScreen({x, y}) {
    const scalar = this.getSizeActualToScreenScalar();
    return { x: x * scalar, y: y * scalar };
  }

  sizeScreenToActual({x, y}) {
    let scalar = 1 / this.getSizeActualToScreenScalar();
    return { x: x * scalar, y: y * scalar };      
  }

  // All this logic is needed because the image may have some white bars on the sides or top/bottom
  // And apparently these bars are counted in the html element's position and size
  // So the image's actual pixel aspect ratio may be different from the html element's aspect ratio
  getSizeActualToScreenScalar() {
    const screenSize = this.state.screenSize;
    const actualSize = this.props.size;
    if (screenSize.height / screenSize.width > actualSize.height / actualSize.width) {
      // screen is taller than actual, width is accurate, use width to scale
      return screenSize.width / actualSize.width;
    } else {
      // screen is wider than actual, height is accurate, use height to scale
      return screenSize.height / actualSize.height;
    }
  }

  getScreenSizePos = () => {
    const img = this.imgRef.current;
    const height = img.clientHeight;
    const width = img.clientWidth;
    const x = img.offsetLeft;
    const y = img.offsetTop;
    this.setState({
      screenSize: { width, height },
      screenPos: { x, y },
      screenCenter: { x: x + width / 2, y: y + height / 2 },
    });
  };

  renderFace() {
    const face = (
      <img
        src={this.props.src}
        alt='face'
        loading='lazy'
        key='image'
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onLoad={this.getScreenSizePos}
        ref={this.imgRef}
      />
    );

    let centerMarker = '';
    if (this.state.screenSize != null && this.state.screenPos != null) {
      const screenCenter = this.state.screenCenter;
      let diff = this.subtractVectors(this.props.pos, this.getCenter(this.props.size));
      diff = this.sizeActualToScreen(diff);
      const center = this.addVectors(screenCenter, diff)
      centerMarker = (
        <>
          <Paper
            sx={{
              position: 'absolute',
              top: center.y,
              left: center.x,
              transform: 'translate(-50%, -50%)',
              borderRadius: 100,
              opacity: 0.3,
            }}
            elevation={4}
          >
            <IconButton><AddIcon/></IconButton>
          </Paper>
          <AddIcon
            sx={{
              position: 'absolute',
              top: center.y,
              left: center.x,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </>
      )
    }

    return (
      <Box
        className='selectDisable'
        sx={{ height: '100%', borderColor: 'black', borderWidth: 2, borderStyle: 'solid', pointerEvents: 'none' }}
      >
        {centerMarker}
        {face}
      </Box>
    );
  }

  render() {
    if (!this.props.src)
      return '';
    
    const face = this.renderFace();

    const screenSize = this.state.screenSize;
    const positionInput = (
      <PositionInput
        name='Center'
        x={this.props.pos.x}
        y={this.props.pos.y}
        step={1}
        minX={0}
        minY={0}
        maxX={screenSize == null ? 100 : screenSize.width}
        maxY={screenSize == null ? 100 : screenSize.height}
        onChange={this.props.onCenterChange}
      />
    );
    const changeFace = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={this.props.disabled}
        >
          <Typography variant="h6">Change Face</Typography>
          <input type="file" accept="image/*" hidden onChange={this.props.onFaceUpload} />
        </Button>
      </Box>
    );

    return (
      <Box sx={{ height: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant='h4' component='h4'>Face</Typography>
          {changeFace}
        </Stack>
        {face}
        {positionInput}
      </Box>
    );
  }
}