import React from 'react';
import './FaceCenterer.css'

import { PositionInput } from './Input.jsx';
import UploadButton from './UploadButton';
import InfoModal from './InfoModal';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';

// Text for the info popup
const infoModalText = {
  title: 'Face Editor',
  body: (
    <Typography variant="body1" component="p">
      Set the face center by clicking on the image or entering the coordinates below. This shifts the face on all frames.
    </Typography>
  ),
  button: 'Got it!',
}

/**
 * FaceCenterer
 * Display face
 * Change face center/anchor for all frames
 * Click on face with mouse or use input boxes
 */
export default class FaceCenterer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // face image size and position on user's screen
      screenSize: null,
      screenPos: null,
    };
    // Ref to face image for getting size and position on screen
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

  // Set face center using mouse
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

  // Util

  getCenter = ({ width, height }) => {
    return { x: width / 2, y: height / 2 };
  }
  
  addVectors = (vec1, vec2) => {
    return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
  }
  
  subtractVectors = (vec1, vec2) => {
    return { x: vec1.x - vec2.x, y: vec1.y - vec2.y };
  }

  /**
   * Check if the [mouse] position is in the face on the user's screen
   * @param {Object} size {x, y} x and y position on screen
   * @returns true if in bounds, false if not in the face
   */
  isInBounds({x, y}) {
    const screenPos = this.state.screenPos;
    const screenSize = this.state.screenSize;
    return (
      x >= screenPos.x && x <= screenPos.x + screenSize.width &&
      y >= screenPos.y && y <= screenPos.y + screenSize.height
    );
  }

  /**
   * Convert actual pixel size to screen displayed size
   * @param {Object} size {x, y} actual pixel size
   * @returns {x, y} scaled width and height
   */
  sizeActualToScreen({x, y}) {
    const scalar = this.getSizeActualToScreenScalar();
    return { x: x * scalar, y: y * scalar };
  }

  /**
   * Convert screen displayed size to actual pixel size
   * @param {Object} size {x, y} screen displayed size
   * @returns {x, y} scaled width and height
   */
  sizeScreenToActual({x, y}) {
    let scalar = 1 / this.getSizeActualToScreenScalar();
    return { x: x * scalar, y: y * scalar };      
  }

  /**
   * Calculate scalar to convert actual pixel size to screen displayed size
   * 
   * All this logic is needed because the image may have some white bars on the sides or top/bottom
   * And apparently these bars are counted in the html element's position and size
   * So the image's actual pixel aspect ratio may be different from the html element's aspect ratio
   * @returns scalar
   */
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

  /**
   * Get the size and position of the image on the user's screen
   */
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

  /**
   * Render face image and center marker
   * @returns jsx for the face image with center marker
   */
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
    // Only render center marker when the face is loaded on the screen and we know its position and size
    if (this.state.screenSize != null && this.state.screenPos != null) {
      // Calculate center marker position
      const screenCenter = this.state.screenCenter;
      let diff = this.subtractVectors(this.props.pos, this.getCenter(this.props.size));
      diff = this.sizeActualToScreen(diff);
      const center = this.addVectors(screenCenter, diff)

      // Render center marker
      // Use paper for the shadow
      // Use AddIcon for the marker/crosshair
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
        sx={{ height: '100%', borderColor: 'black', borderWidth: 2, borderStyle: 'solid', pointerEvents: 'none', mb: 0.5 }}
      >
        {centerMarker}
        {face}
      </Box>
    );
  }

  /**
   * Render FaceCenterer component
   * @returns jsx for the FaceCenterer component
   */
  render() {
    if (!this.props.src)
      return '';
    
    // Face and center marker
    const face = this.renderFace();

    // Input boxes
    const screenSize = this.state.screenSize;
    const positionInput = (
      <PositionInput
        name='Face Center'
        x={this.props.pos.x}
        y={this.props.pos.y}
        step={1}
        minX={0}
        minY={0}
        maxX={screenSize == null ? 100 : screenSize.width}
        maxY={screenSize == null ? 100 : screenSize.height}
        onXChange={(x) => this.props.onCenterChange({ x: x, y: this.props.pos.y })}
        onYChange={(y) => this.props.onCenterChange({ x: this.props.pos.x, y: y })}
        disabled={this.props.disabled}
      />
    );

    // Change face button
    const changeFace = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <UploadButton type='face' text='Change Face' onUpload={this.props.onFaceUpload} onPickSample={this.props.onPickSample} disabled={this.props.disabled} />
      </Box>
    );

    return (
      <Box sx={{ height: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant='h4' component='h4'>Face Editor</Typography>
          {changeFace}
        </Stack>
        {face}
        {positionInput}
        <InfoModal hasButton {...infoModalText}/>
      </Box>
    );
  }
}