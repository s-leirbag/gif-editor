import React from 'react';
import './ImageEditor.css'

import { PositionInput, InputSlider } from './Input.jsx';

import Box from '@mui/material/Box';
// import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

export default class ImageEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenSize: null,
      screenPos: null,
      dragStart: null,
    };
  }

  componentDidMount() {
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
  }
  
  componentWillUnmount() {
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseDown = (e) => {
    const coord = { x: e.clientX, y: e.clientY };
    if (this.isInBounds(coord))
      this.setState({ dragStart: coord });
  }

  handleMouseUp = (e) => {
    const coord = { x: e.clientX, y: e.clientY };
    if (this.state.dragStart != null && this.isInBounds(coord)) {
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
    return (
      x >= screenPos.x && x <= screenPos.x + screenSize.width &&
      y >= screenPos.y && y <= screenPos.y + screenSize.height
    );
  }

  sizeActualToScreen({x, y}) {
    const screenSize = this.state.screenSize;
    return {
      x: x * screenSize.width / this.props.size.width,
      y: y * screenSize.height / this.props.size.height,
    };
  }

  sizeScreenToActual({x, y}) {
    const screenSize = this.state.screenSize;
    return {
      x: x * this.props.size.width / screenSize.width,
      y: y * this.props.size.height / screenSize.height,
    };
  }

  renderImage() {
    const image = [
      <img
        src={this.props.src}
        alt={this.props.name}
        loading="lazy"
        key='image'
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onLoad={({target:img}) => {
          const height = img.clientHeight;
          const width = img.clientWidth;
          const x = img.getBoundingClientRect().left;
          const y = img.getBoundingClientRect().top;
          this.setState({
            screenSize: { width, height },
            screenPos: { x, y },
          });
        }}
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
      />
    )
    const scaleSlider = <InputSlider name='Scale' value={this.props.scale} step={0.05} min={0} max={2} onChange={this.props.onScaleChange}/>;
    const rotateSlider = <InputSlider name='Rotate' value={this.props.rotation} step={1} min={-180} max={180} onChange={this.props.onRotateChange}/>;
    const overlaySwitch = this.props.overlay ? (
      <Paper sx={{ position: 'absolute', p: 1, borderRadius: 100, alignItems: 'center' }} elevation={4}>
        <Stack spacing={0.5} direction="row" alignItems="center">
          <Typography variant='h6' component='h6'>Overlay</Typography>
          <Switch
            checked={this.props.isOverlayOn}
            onChange={this.props.onOverlayChange}
          />
        </Stack>
      </Paper>
    ) : '';

    return (
      <Box sx={{ height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column' }}>
        {image}
        {scaleSlider}
        {positionInput}
        {rotateSlider}
        {overlaySwitch}
      </Box>
    );
  }
}