import React from 'react';
import './ImageEditor.css'

import { PositionInput, InputSlider } from './Input.jsx';
import UploadButton from './UploadButton';
import InfoModal from './InfoModal';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const infoModalText =  {
  title: 'Frame Editor',
  body: (
    <Typography variant="body1" component="p">
      Drag the face around and modify the settings for the frame.
      <br/><br/>Scale: face size
      <br/>Rotate: face rotation in degrees
      <br/>Position: face location on frame
      <br/>Face layer: front/back/hidden, layer relative to frame
      <br/>Overlay: guiding image/original gif to help you position, does not appear in final gif
    </Typography>
  ),
  button: 'Got it!',
}

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

      const newPos = { x: Math.round(this.props.x + diff.x), y: Math.round(this.props.y + diff.y) };

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

    const faceLayer = this.props.faceLayer;
    const disabled = this.props.disabled;
    const transformButtonsDisabled = disabled || faceLayer === 'hide';
    const screenSize = this.state.screenSize;
    const positionInput = (
      <PositionInput
        name='Position'
        x={this.props.x}
        y={this.props.y}
        step={1}
        minX={0}
        minY={0}
        maxX={screenSize == null ? 100 : screenSize.width}
        maxY={screenSize == null ? 100 : screenSize.height}
        onXChange={this.props.onXChange}
        onYChange={this.props.onYChange}
        disabled={transformButtonsDisabled}
      />
    )
    const scaleSlider = (
      <InputSlider
        name='Scale'
        value={this.props.scale}
        step={0.025}
        min={0}
        max={2}
        onChange={this.props.onScaleChange}
        disabled={transformButtonsDisabled}
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
        disabled={transformButtonsDisabled}
      />
    );
    const faceSwitch = (
      <Stack spacing={0.5} direction="row" alignItems="center">
        <Typography variant='h6' component='h6'>Face</Typography>
        <ToggleButtonGroup
          value={this.props.faceLayer}
          exclusive
          onChange={(e, v) => {this.props.onFaceLayerChange(v === null ? this.props.faceLayer : v)}}
          aria-label='face layer'
          color={disabled ? 'standard' : 'primary'}
          disabled={disabled}
        >
          {['front', 'back', 'hide'].map((value) => (
            <ToggleButton value={value} aria-label={value} key={value} sx={{ pt: 0.5, pb: 0.5 }}>
              {value === 'hide' ? <VisibilityOffIcon /> : value}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    );

    let overlayButton = '';
    if (this.props.overlay) {
      overlayButton = (
        <Switch
          checked={this.props.overlay && this.props.isOverlayOn}
          onChange={this.props.onOverlayChange}
          disabled={disabled || !this.props.overlay}
          color={disabled || !this.props.overlay ? 'default' : 'primary'}
        />
      );
    }
    else {
      overlayButton = <UploadButton type='overlay' text='Set Overlay' onUpload={this.props.onOverlaysUpload} disabled={disabled} />;
    }
    const overlayUI = (
      <Stack spacing={0.5} direction="row" alignItems="center">
        <Typography variant='h6' component='h6'>Overlay</Typography>
        {overlayButton}
      </Stack>
    )

    const changeGif = (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <UploadButton type='gif' text='Change Gif' onUpload={this.props.onImagesUpload} onPickSample={this.props.onPickSample} disabled={disabled} />
      </Box>
    );

    return (
      <Box sx={{ height: 'calc(100% - 160px)', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant='h4' component='h4'>Frame Editor</Typography>
          {changeGif}
        </Stack>
        {image}
        <Grid container columnSpacing={4} sx={{ height: '100%', mt: 0.5 }}>
          <Grid item xs={6}>
            {scaleSlider}
            {rotateSlider}
          </Grid>
          <Grid item xs={6}>
            {faceSwitch}
            {overlayUI}
          </Grid>
          <Grid item xs={12}>
            {positionInput}
            <InfoModal hasButton {...infoModalText} width='60%'/>
          </Grid>
        </Grid>
      </Box>
    );
  }
}