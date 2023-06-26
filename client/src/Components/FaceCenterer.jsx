import React from 'react';
import './FaceCenterer.css'

import { PositionInput } from './Input.jsx';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';

import AddIcon from '@mui/icons-material/Add';

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
      // Get new center
      const screenPos = this.state.screenPos;
      let newPos = { x: coord.x - screenPos.x, y: coord.y - screenPos.y };
      newPos = this.sizeScreenToActual(newPos);
      newPos = { x: Math.round(newPos.x), y: Math.round(newPos.y) };

      this.props.onCenterChange(newPos);
    }
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
      const screenPos = this.state.screenPos;
      const center = {
        x: screenPos.x + this.sizeActualToScreen(this.props.pos).x,
        y: screenPos.y + this.sizeActualToScreen(this.props.pos).y,
      }
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

    return (
      <Box sx={{ height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column' }}>
        {face}
        {positionInput}
      </Box>
    );
  }
}