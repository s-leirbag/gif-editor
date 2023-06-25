import React from 'react';
import './App.css';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

import ImageEditor from './Components/ImageEditor.jsx';

import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { cloneDeep } from 'lodash';
// import { clone, sample, isEmpty } from 'lodash';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      face: '', // uri of face to edit into iamges
      imgs: [], // original images
      imgsEdited: [], // edited images
      curImg: null, // current image the user is editing
      overlays: [], // overlays to help user edit easily
      isOverlayOn: true,
      checked: [], // checked images to apply transforms to multiple frames at once
      faceSize: null, // face size in pixels
      faceScaleSize: null, // scaled face size in pixels
      gifSize: null, // gif images size in pixels
      faceCenter: null, // center position on face in pixels
      gifPositions: [], // position of face on gif images in pixels
      faceScale: 1, // slider value for face scale
      gifFaceScales: [], // compounding scale for face in each gif image
      gifRotations: [], // rotation of face in each gif image
      playIntervalId: null, // interval for playing gif
    };
    this.curImgRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = (event) => {
    if (this.state.imgs.length === 0)
      return;

    const curImg = this.state.curImg;
    const imgsLength = this.state.imgs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      this.setState({ curImg: curImg === 0 ? imgsLength - 1 : curImg - 1 }, this.scrollIntoView);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      this.setState({ curImg: (curImg + 1) % imgsLength }, this.scrollIntoView);
  }

  handlePlayPause = (event) => {
    if (this.state.playIntervalId) {
      clearInterval(this.state.playIntervalId);
      this.setState({
        playIntervalId: null,
      });
    }
    else {
      const imgsLength = this.state.imgs.length;
      this.setState({
        curImg: 0,
        playIntervalId: setInterval(() => {
            this.setState({ curImg: (this.state.curImg + 1) % imgsLength }, this.scrollIntoView);
        }, 100),
      });
    }
  }

  scrollIntoView = () => this.curImgRef.current.scrollIntoView();

  handleFaceUpload = (e) => {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      const img = urls[0];
      this.setState({ face: img });
      this.getImgSize(img, (size) => this.setState({
        faceSize: size,
        faceCenter: { x: size.width / 2, y: size.height / 2 },
      }, this.fetchEditedImg));
    });
  }

  handleImagesUpload = async (e) => {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      this.setState({ imgs: urls, imgsEdited: urls, checked: Array(urls.length).fill(false) });

      // Get gif dimensions
      this.getImgSize(urls[0], (size) => this.setState({
        gifSize: size,
        gifFaceScales: Array(urls.length).fill(1),
        gifPositions: Array(urls.length).fill({ x: parseInt(size.width / 2), y: parseInt(size.height / 2) }),
        gifRotations: Array(urls.length).fill(0),
      }, this.fetchEditedImg));

      // Select first image if first upload
      if (this.state.curImg == null)
        this.setState({ curImg: 0 });
    });
  }

  handleOverlaysUpload = (e) => {
    e.preventDefault();
    this.readFileImgUrls(e.target.files, (urls) => {
      this.setState({ overlays: urls });
      this.fetchEditedImg();
    });
  }

  handleIsOverlayOn = (e, c) => {
    this.setState({ isOverlayOn: c });
  }

  handleDownload = (e) => {
    e.preventDefault();
    const zip = new JSZip();
    const imgsEdited = this.state.imgsEdited;
    for (let i = 0; i < imgsEdited.length; i++) {
      const img = imgsEdited[i];
      const imgName = `img${i}.png`;
      zip.file(imgName, img.split(",")[1], { base64: true });
    }
    zip.generateAsync({ type: "blob" }).then(function (content) {
      FileSaver.saveAs(content, "edited_gif.zip");
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

  fetchEditedImg = async (imgIndex) => {
    if (this.isAnyVarsNull('faceSize', 'gifSize', 'faceCenter', 'gifPositions', 'gifFaceScales'))
      return;
    
    if (imgIndex == null)
      imgIndex = this.state.curImg;
    const faceSize = this.state.faceSize;
    const gifSize = this.state.gifSize;

    const scale = this.state.faceScale * this.state.gifFaceScales[imgIndex];
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
    data.append('faceCenter', JSON.stringify(this.state.faceCenter));
    data.append('facePos', JSON.stringify(this.state.gifPositions[imgIndex]));
    data.append('faceRot', JSON.stringify(this.state.gifRotations[imgIndex]));
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

  handleFaceScaleChange = (e, v) => {
    this.setState({ faceScale: v }, this.fetchEditedImg);
  }

  handleClickImage = (i) => {
    this.setState({ curImg: i });
  }
  
  handleCheck = (i, e) => {
    const newChecked = cloneDeep(this.state.checked);
    newChecked[i] = e.target.checked
    this.setState({ checked: newChecked });
  }

  handleCheckAll = () => {
    this.setState({ checked: Array(this.state.imgs.length).fill(true) });
  }

  handleUncheckAll = () => {
    this.setState({ checked: Array(this.state.imgs.length).fill(false) });
  }

  renderScrollImg(i) {
    // If current image, highlight border
    // And create ref to scroll to image
    let bgCol, ref;
    if (this.state.curImg === i) {
      bgCol = 'yellow';
      ref = this.curImgRef;
    }
    
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', mr: 1, height: '100%' }} key={i}>
        <Box
          component='img'
          src={this.state.imgsEdited[i]}
          alt={'image ' + i}
          loading='lazy'
          sx={{ height: '100%', borderColor: bgCol, borderWidth: 2, borderStyle: 'solid' }}
          onClick={() => this.handleClickImage(i)}
          ref={ref}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
          }}
        >
          <Checkbox checked={this.state.checked[i]} onChange={(e) => this.handleCheck(i, e)} />
        </Box>
      </Box>
    );
  }

  renderFace() {
    if (this.isAnyVarsNull('faceSize', 'faceCenter')) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            sx={{ marginRight: "1rem" }}
          >
            <Typography variant="h6" component='h6'>Upload Face</Typography>
            <input type="file" accept="image/*" hidden onChange={this.handleFaceUpload} />
          </Button>
        </Box>
      );
    }
    else {
      // return <ImageEditor
      //   name='face'
      //   src={this.state.face}
      //   size={this.state.faceSize}
      //   pos={this.state.faceCenter}
      //   scale={this.state.faceScale}
      //   onPosChange={(pos) => this.setState({ faceCenter: pos }, this.fetchEditedImg)}
      //   onScaleChange={this.handleFaceScaleChange}
      //   onRotateChange
      // />;
    }
  }

  renderCurImg() {
    if (this.isAnyVarsNull('gifSize', 'gifPositions')) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            sx={{ marginRight: "1rem" }}
          >
            <Typography variant="h6">Upload Images</Typography>
            <input type="file" accept="image/*" multiple hidden onChange={this.handleImagesUpload} />
          </Button>
        </Box>
      );
    }
    else {
      const curImg = this.state.curImg;
      const overlayButton = this.renderOverlayButton();
      return (
        <>
          {overlayButton}
          <ImageEditor
            name='current'
            src={this.state.imgsEdited[curImg]}
            overlay={this.state.overlays[curImg]}
            isOverlayOn={this.state.isOverlayOn}
            faceScaleSize={this.state.faceScaleSize}
            size={this.state.gifSize}
            pos={this.state.gifPositions[curImg]}
            scale={this.state.gifFaceScales[curImg]}
            rotation={this.state.gifRotations[curImg]}
            onPosChange={(pos) => {
              let newGifPositions = cloneDeep(this.state.gifPositions);
              newGifPositions[curImg] = pos;
              this.setState({ gifPositions: newGifPositions }, this.fetchEditedImg);
            }}
            onScaleChange={(scale) => {
              // console.log(scale);
              const newScales = cloneDeep(this.state.gifFaceScales);
              newScales[curImg] = scale;
              this.setState({ gifFaceScales: newScales }, this.fetchEditedImg);
            }}
            onOverlayChange={this.handleIsOverlayOn}
            onRotateChange={(deg) => {
              // console.log(deg);
              const newRotations = cloneDeep(this.state.gifRotations);
              newRotations[curImg] = deg;
              this.setState({ gifRotations: newRotations }, this.fetchEditedImg);
            }}
            key={curImg} // jank?
          />
        </>
      );
    }
  }

  renderOverlayButton() {
    return this.state.overlays && this.state.overlays.length > 0 ? null : (
      <Paper sx={{ position: 'absolute', borderRadius: 100, alignItems: "center" }} elevation={4}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{ borderRadius: 100 }}
        >
          <Typography variant="h6">Upload Overlays</Typography>
          <input type="file" accept="image/*" multiple hidden onChange={this.handleOverlaysUpload} />
        </Button>
      </Paper>
    );
  }

  renderScroll() {
    if (this.state.imgsEdited.length !== 0) {
      return <>
        <Stack sx={{ position: 'absolute', zIndex: 2 }} spacing={2} direction="row" alignItems="center">
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            <IconButton
              component="label"
              variant="outlined"
              onClick={this.handlePlayPause}
              sx={{ borderRadius: 100 }}
            >
              {this.state.playIntervalId ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            <IconButton
              component="label"
              variant="outlined"
              onClick={this.handleDownload}
              sx={{ borderRadius: 100 }}
            >
              <DownloadIcon />
            </IconButton>
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            <Button
              component="label"
              variant="outlined"
              onClick={this.handleCheckAll}
              sx={{ borderRadius: 100 }}
            >
              Select All
            </Button>
          </Paper>
        </Stack>
        <Box sx={{ height: '100%', whiteSpace: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }}>
          {this.state.imgsEdited.map((image, index) => (this.renderScrollImg(index)))}
        </Box>
      </>
    }
  }

  render() {
    const face = this.renderFace();
    const curImg = this.renderCurImg();
    const scroll = this.renderScroll();
    return (
      <div className="App">
        <CssBaseline />
        <Grid container columnSpacing={2} sx={{ p: 2, height: '100vh' }}>
          <Grid item xs={6} sx={{ height: '70%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {face}
            </Paper>
          </Grid>
          <Grid item xs={6} sx={{ height: '70%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {curImg}
            </Paper>
          </Grid>
          <Grid item xs={12} sx={{ height: 'calc(30% - 16px)', mt: 2 }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {scroll}
            </Paper>
          </Grid>
        </Grid>
      </div>
    );
  }
}
