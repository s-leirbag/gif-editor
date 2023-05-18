import React from 'react';
import './App.css';
import Draggable from 'react-draggable';

import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import AnchorIcon from '@mui/icons-material/Anchor';
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { cloneDeep } from 'lodash';
// import { clone, sample, isEmpty } from 'lodash';

class AnchoredImage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenSize: null,
      screenPos: null,
      iconSize: { width: 0, height: 0 },
      anchor: props.anchor,
    };
  }

  actualToScreen({x, y}) {
    const screenSize = this.state.screenSize;
    return {
      x: x * screenSize.width / this.props.size.width,
      y: y * screenSize.height / this.props.size.height,
    };
  }

  screenToActual({x, y}) {
    const screenSize = this.state.screenSize;
    return {
      x: x * this.props.size.width / screenSize.width,
      y: y * this.props.size.height / screenSize.height,
    };
  }

  handleDragStop(e, data) {
    const newAnchor = this.screenToActual(data);
    this.props.onAnchorChange(newAnchor);
    this.setState({anchor: newAnchor});
  }

  render() {
    if (!this.props.src) {
      return '';
    }
    else {
      const anchoredImage = [<img
        src={this.props.src}
        width={'100%'}
        alt={this.props.imageName}
        loading="lazy"
        key='image'
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
      />];

      const screenSize = this.state.screenSize;
      const screenPos = this.state.screenPos;
      const iconSize = this.state.iconSize;
      if (screenSize != null && screenSize != null) {
        if (this.props.guide) {
          anchoredImage.push(<img
            src={this.props.guide}
            width={screenSize.width}
            alt={this.props.imageName}
            loading="lazy"
            key='guide'
            style={{ opacity: 0.2, position: 'absolute', top: screenPos.y, left: screenPos.x }}
          />);
        }

        anchoredImage.push(
          <Draggable
            handle=".handle"
            key='anchor'
            position={this.actualToScreen(this.state.anchor)}
            bounds={{left: 0, top: 0, right: screenSize.width, bottom: screenSize.height}}
            onStop={(e, data) => this.handleDragStop(e, data)}
          >
            <AnchorIcon
              className='handle'
              key='anchor'
              sx={{ position: 'absolute', top: screenPos.y - iconSize.height / 2, left: screenPos.x - iconSize.width / 2 }}
              onLoad={({target:el}) => {
                const height = el.clientHeight;
                const width = el.clientWidth;
                this.setState({ iconSize: { width, height } });
              }}
            />
          </Draggable>
        );
      }
      return (
        <Box
          sx={{borderColor: 'black', borderWidth: 2, borderStyle: 'solid'}}
        >
          {anchoredImage}
        </Box>
      );
    }
  }
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      face: '',
      imgs: [],
      imgGuides: [],
      isGuideOn: true,
      imgsEdited: [],
      selectedImg: null,
      faceSize: null,
      faceScaleSize: null,
      gifSize: null,
      faceAnchor: null,
      gifAnchors: [],
      faceScale: 50,
    };
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = (event) => {
    const selectedImg = this.state.selectedImg;
    const imgsLength = this.state.imgs.length;
    if (event.key === 'ArrowUp')
      this.setState({ selectedImg: selectedImg === 0 ? imgsLength - 1 : selectedImg - 1 });
    if (event.key === 'ArrowDown')
      this.setState({ selectedImg: (selectedImg + 1) % imgsLength });
  }

  handleFaceUpload(e) {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      const img = urls[0];
      this.setState({ face: img });
      this.getImgSize(img, (size) => this.setState({
        faceSize: size,
        faceAnchor: { x: size.width / 2, y: size.height / 2 },
      }, () => this.fetchEditedImg()));
    });
  }

  async handleImagesUpload(e) {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      this.setState({ imgs: urls, imgsEdited: urls });

      // Get gif dimensions
      this.getImgSize(urls[0], (size) => this.setState({
        gifSize: size,
        gifAnchors: Array(urls.length).fill({ x: size.width / 2, y: size.height / 2 }),
      }, () => this.fetchEditedImg()));

      // Select first image if first upload
      if (this.state.selectedImg == null)
        this.setState({ selectedImg: 0 });
    });
  }

  handleGuidesUpload(e) {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      this.setState({ imgGuides: urls });
      this.fetchEditedImg()
    });
  }

  readFileImgUrls(files, callback) {
    if (!files)
      return;

    function readFile(file) {
      return new Promise(function (resolve, reject) {
        const fr = new FileReader();
        fr.onload = function(){ resolve(fr.result) };
        fr.onerror = function(){ reject(fr) };
        fr.readAsDataURL(file);
      });
    }

    // Store promises in array
    let readers = [];
    for(const file of files)
      readers.push(readFile(file));
    
    // Trigger Promises
    Promise.all(readers).then(callback);
  }

  async fetchEditedImg() {
    if (this.isAnyVarsNull('faceSize', 'gifSize', 'faceAnchor', 'gifAnchors'))
      return;
    
    const imgIndex = this.state.selectedImg;
    const faceSize = this.state.faceSize;
    const gifSize = this.state.gifSize;

    const scale = this.state.faceScale / 100 * 2;
    let faceScaleSize = {};
    if (faceSize.width / faceSize.height > gifSize.width / gifSize.height) {
      faceScaleSize.width = gifSize.width * scale;
      faceScaleSize.height = faceSize.height * (gifSize.width / faceSize.width) * scale;
    }
    else {
      faceScaleSize.height = gifSize.height * scale;
      faceScaleSize.width = faceSize.width * (gifSize.height / faceSize.height) * scale;
    }
    this.setState({ faceScaleSize });
    
    let data = new FormData();
    data.append('face', this.state.face);
    data.append('image', this.state.imgs[imgIndex]);
    data.append('faceSize', JSON.stringify(faceSize));
    data.append('gifSize', JSON.stringify(gifSize));
    data.append('faceScaleSize', JSON.stringify(faceScaleSize));
    data.append('faceAnchor', JSON.stringify(this.state.faceAnchor));
    data.append('imageAnchor', JSON.stringify(this.state.gifAnchors[imgIndex]));
    const response = await fetch('/testAPI', {
      method: "POST",
      body: data,
    });
    if (!response.ok)
      return;

    let newImgsEdited = cloneDeep(this.state.imgsEdited);
    newImgsEdited[imgIndex] = await response.text();
    this.setState({ imgsEdited: newImgsEdited });
  }

  getImgSize(src, callback) {
    const image = new Image();
    image.onload = function() {
      const height = image.height;
      const width = image.width;
      callback({ width, height });
    };
    image.src = src; // this must be done AFTER setting onload
  }

  isAnyVarsNull() {
    for (let i = 0; i < arguments.length; i++) {
      if (this.state[arguments[i]] == null)
        return true;
    }
    return false;
  }
  
  handleFaceScaleChange(e, v) {
    this.setState({ faceScale: v });
  }

  handleFaceScaleChangeCommitted(e, v) {
    this.setState({ faceScale: v });
    this.fetchEditedImg();
  }

  handleIsGuideOnChange(e, c) {
    this.setState({ isGuideOn: c });
  }

  handleClickImage(i) {
    this.setState({ selectedImg: i });
  }

  renderImg(i) {
    // Highlight image if selected
    let bgCol;
    if (this.state.selectedImg === i)
      bgCol = 'yellow';
    
    return (
      <Box
        component='img'
        key={i}
        src={this.state.imgsEdited[i]}
        alt={'image ' + i}
        loading='lazy'
        sx={{ width: '100%', borderColor: bgCol, borderWidth: 2, borderStyle: 'solid' }}
        onClick={() => this.handleClickImage(i)}
      />
    );
  }

  renderFace() {
    if (this.isAnyVarsNull('faceSize', 'faceAnchor')) {
      return '';
    }
    else {
      return <AnchoredImage
        imageName='face'
        src={this.state.face}
        size={this.state.faceSize}
        anchor={this.state.faceAnchor}
        onAnchorChange={(anchor) => this.setState({ faceAnchor: anchor }, () => this.fetchEditedImg())}
      />;
    }
  }

  renderSelectedImg() {
    if (this.isAnyVarsNull('gifSize', 'gifAnchors')) {
      return '';
    }
    else {
      const selectedImg = this.state.selectedImg;
      return <AnchoredImage
        imageName='selected'
        src={this.state.imgsEdited[selectedImg]}
        guide={this.state.isGuideOn ? this.state.imgGuides[selectedImg] : null}
        size={this.state.gifSize}
        anchor={this.state.gifAnchors[selectedImg]}
        onAnchorChange={(anchor) => {
          let newGifAnchors = cloneDeep(this.state.gifAnchors);
          newGifAnchors[selectedImg] = anchor;
          this.setState({ gifAnchors: newGifAnchors }, () => this.fetchEditedImg());
        }}
        key={selectedImg} // jank
      />;
    }
  }

  render() {
    const face = this.renderFace();
    const selectedImg = this.renderSelectedImg();
    return (
      <div className="App">
        <CssBaseline />
        <Grid container columnSpacing={2} sx={{ p: 2, height: '100vh' }}>
          <Grid item xs={5}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  sx={{ marginRight: "1rem" }}
                >
                  Upload Face
                  <input type="file" accept="image/*" hidden onChange={(e) => this.handleFaceUpload(e)} />
                </Button>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                >
                  Upload Images with Holes
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => this.handleImagesUpload(e)} />
                </Button>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                >
                  Upload Image Guides
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => this.handleGuidesUpload(e)} />
                </Button>
              </Box>
              {face}
              <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Typography variant='h6' component='h6'>Size</Typography>
                <Slider
                  aria-label='Face size'
                  defaultValue={50}
                  value={this.state.faceScale}
                  valueLabelFormat={(value) => value / 100 * 2}
                  valueLabelDisplay='auto'
                  marks={[
                    { value: 0, label: '0' },
                    { value: 50, label: '1' },
                    { value: 100, label: '2' },
                  ]}
                  onChange={(e, v) => this.handleFaceScaleChange(e, v)}
                  onChangeCommitted={(e, v) => this.handleFaceScaleChangeCommitted(e, v)}
                />
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={5} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {selectedImg}
              <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Typography variant='h6' component='h6'>Guide</Typography>
                <Switch
                  checked={this.state.isGuideOn}
                  onChange={(e, c) => this.handleIsGuideOnChange(e, c)}
                />
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={2} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              <Box sx={{ height: '100%', display: 'block', overflow: 'auto' }}>
                {this.state.imgsEdited.map((image, index) => (
                  this.renderImg(index)
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </div>
    );
  }
}
