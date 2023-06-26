import React from 'react';
import './ImageEditor.css'

import { PositionInput, InputSlider } from './Input.jsx';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import UploadFileIcon from "@mui/icons-material/UploadFile";

export default class ImageEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenSize: null,
      screenPos: null,
      dragStart: null,
    };
    this.imgRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener('resize', this.getScreenSizePos);
  }
  
  componentWillUnmount() {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener('resize', this.getScreenSizePos);
  }

  handleMouseDown = (e) => {
    if (this.props.disabled) return;
    const coord = { x: e.clientX, y: e.clientY };
    if (this.isInBounds(coord))
      this.setState({ dragStart: coord });
  }

  handleMouseUp = (e) => {
    if (this.props.disabled || this.state.dragStart == null || this.props.faceScaleSize == null)
      return;
    const coord = { x: e.clientX, y: e.clientY };
    if (this.isInBounds(coord)) {
      // Get new position
      const dragStart = this.state.dragStart;
      let diff = { x: coord.x - dragStart.x, y: coord.y - dragStart.y };
      diff = this.sizeScreenToActual(diff);

      const pos = this.props.pos;
      const newPos = { x: Math.round(pos.x + diff.x), y: Math.round(pos.y + diff.y) };

      // make sure the new position isn't too far out of bounds
      const faceScaleSize = this.props.faceScaleSize;
      if (newPos.x + faceScaleSize.width < 0) newPos.x = -faceScaleSize.width;
      if (newPos.y + faceScaleSize.height < 0) newPos.y = -faceScaleSize.height;
      if (newPos.x - faceScaleSize.width > this.props.size.width)
        newPos.x = this.props.size.width + faceScaleSize.width;
      if (newPos.y - faceScaleSize.height > this.props.size.height)
        newPos.y = this.props.size.height + faceScaleSize.height;

      this.props.onPosChange(newPos);
    }
    this.setState({ dragStart: null });
  }

  isInBounds({x, y}) {
    const screenPos = this.state.screenPos;
    const screenSize = this.state.screenSize;
    if (screenPos == null || screenSize == null)
      return false;
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
    });
  };

  renderImage() {
    const image = [
      <img
        src={this.props.src}
        alt='current'
        loading='lazy'
        key='image'
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onLoad={this.getScreenSizePos}
        ref={this.imgRef}
      />
    ];

    const screenSize = this.state.screenSize;
    const screenPos = this.state.screenPos;
    if (screenSize != null && screenPos != null && this.props.isOverlayOn && this.props.overlay) {
      image.push(
        <img
          src={this.props.overlay}
          alt='overlay'
          loading="lazy"
          key='overlay'
          style={{
            width: screenSize.width, height: screenSize.height, objectFit: 'contain',
            position: 'absolute', top: screenPos.y, left: screenPos.x,
            opacity: 0.3,
          }}
        />
      );
    }

    return (
      <Box
        className='selectDisable'
        sx={{ height: '100%', borderColor: 'black', borderWidth: 2, borderStyle: 'solid', pointerEvents: 'none' }}
      >
        {image}
      </Box>
    );
  }

  render() {
    if (!this.props.src)
      return '';
    
    const image = this.renderImage();

    const disabled = this.props.disabled;
    const faceShown = this.props.faceShown;
    const screenSize = this.state.screenSize;
    const positionInput = (
      <PositionInput
        name='Position'
        x={this.props.pos.x}
        y={this.props.pos.y}
        step={1}
        minX={0}
        minY={0}
        maxX={screenSize == null ? 100 : screenSize.width}
        maxY={screenSize == null ? 100 : screenSize.height}
        onChange={this.props.onPosChange}
        disabled={disabled || !faceShown}
      />
    )
    const scaleSlider = (
      <InputSlider
        name='Scale'
        value={this.props.scale}
        step={0.05}
        min={0}
        max={2}
        onChange={this.props.onScaleChange}
        disabled={this.props.disabled || !faceShown}
      />
    );
    const rotateSlider = (
      <InputSlider
        name='Rotate'
        value={this.props.rotation}
        step={1}
        min={-180}
        max={180}
        onChange={this.props.onRotateChange}
        disabled={this.props.disabled || !faceShown}
      />
    );
    const faceSwitch = (
      <Stack spacing={0.5} direction="row" alignItems="center">
        <Typography variant='h6' component='h6'>Face</Typography>
        <Switch
          checked={this.props.faceShown}
          onChange={this.props.onFaceToggle}
          disabled={this.props.disabled}
          color={this.props.disabled ? 'default' : 'primary'}
        />
      </Stack>
    );
    let overlayUpload = '';
    let overlaySwitch = '';
    overlaySwitch = (
      <Stack spacing={0.5} direction="row" alignItems="center">
        <Typography variant='h6' component='h6'>Overlay</Typography>
        <Switch
          checked={this.props.isOverlayOn}
          onChange={this.props.onOverlayChange}
          disabled={this.props.disabled || !this.props.overlay}
          color={this.props.disabled || !this.props.overlay ? 'default' : 'primary'}
        />
      </Stack>
    );
    overlayUpload = (
      <Box>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={this.props.disabled}
        >
          <Typography variant="h6">{this.props.overlay ? 'Swap Overlay' : 'Set Overlay'}</Typography>
          <input type="file" accept="image/*" multiple hidden onChange={this.props.onOverlaysUpload} />
        </Button>
      </Box>
    );
    const changeGif = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={this.props.disabled}
        >
          <Typography variant="h6">Change Gif</Typography>
          <input type="file" accept="image/*" multiple hidden onChange={this.props.onImagesUpload} />
        </Button>
      </Box>
    );

    return (
      <Box sx={{ height: 'calc(100% - 160px)', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant='h4' component='h4'>Gif</Typography>
          {changeGif}
        </Stack>
        {image}
        <Grid container columnSpacing={4} sx={{ height: '100%' }}>
          <Grid item xs={7} sx={{ height: '70%' }}>
            {scaleSlider}
            {rotateSlider}
            {positionInput}
          </Grid>
          <Grid item xs={5} sx={{ height: '70%' }}>
            {faceSwitch}
            {overlaySwitch}
            {overlayUpload}
          </Grid>
        </Grid>
      </Box>
    );
  }
}