import React from 'react';
import './App.css';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

import DebugModal from './Components/DebugModal.jsx';
import FaceCenterer from './Components/FaceCenterer.jsx';
import ImageEditor from './Components/ImageEditor.jsx';
import InfoModal from './Components/InfoModal.jsx';
import UploadButton from './Components/UploadButton.jsx';
import { sampleGifCounts } from './Constants.js';

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

import { cloneDeep } from 'lodash';
// import { clone, sample, isEmpty } from 'lodash';

const infoModalText = {
  'welcome': {
    title: 'Welcome to Gif Editor!',
    body: 'Are you ready to animate some awesome gifs? Set a face and gif to begin.',
    button: 'Get started!',
  },
  'basics': {
    title: 'Great! Time to edit.',
    body: (
      <Typography variant="body1" component="p">
        Use the buttons below to move, scale, and rotate your face.
        <br/><br/>When you are done, download your gif in the bottom left corner!
      </Typography>
    ),
    button: 'Got it!',
  },
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      introStage: 0, // stage of info modal, 0: welcome intro, 1: blank, 2: info after setting face & gif, 3: blank
      face: null, // uri of face to edit into iamges
      imgs: [], // original images
      imgsEdited: [], // edited images
      curImg: null, // current image the user is editing
      overlays: [], // overlays to help user edit easily
      isOverlayOn: false,
      checked: [], // checked images to apply transforms to multiple frames at once
      shiftDown: false, // bool if shift key is down
      commandDown: false, // bool if command key is down
      faceSize: null, // face size in pixels
      faceScaleSize: null, // scaled face size in pixels
      gifSize: null, // gif images size in pixels
      faceCenter: null, // center position on face in pixels
      gifFaceLayers: null, // layer of face in each gif image, front/back/hide
      gifXs: null, // x position of face in each gif image
      gifYs: null, // y position of face in each gif image
      gifFaceScales: null, // compounding scale for face in each gif image
      gifRotations: null, // rotation of face in each gif image
      playIntervalId: null, // interval for playing gif
    };
    this.curImgRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  handleKeyDown = (event) => {
    if (event.key === 'Shift')
      this.setState({ shiftDown: true });
    if (event.key === 'Meta')
      this.setState({ commandDown: true });

    if (this.state.imgs.length === 0)
      return;

    const curImg = this.state.curImg;
    const imgsLength = this.state.imgs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      this.setState({ curImg: curImg === 0 ? imgsLength - 1 : curImg - 1 }, this.scrollIntoView);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      this.setState({ curImg: (curImg + 1) % imgsLength }, this.scrollIntoView);
  }

  handleKeyUp = (event) => {
    if (event.key === 'Shift')
      this.setState({ shiftDown: false });
    if (event.key === 'Meta')
      this.setState({ commandDown: false });
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
    this.readFileImgUrls(e.target.files, (urls) => {
      const face = urls[0];
      this.getImgSize(face, (size) => this.setState({
        face,
        faceSize: size,
        faceCenter: { x: size.width / 2, y: size.height / 2 },
      }, () => {
        this.updateAllImages();
        if (this.state.introStage === 1 && this.state.imgs.length > 0)
          this.setState({ introStage: this.state.introStage + 1 });
      }));
    });
  }

  handleImagesUpload = async (e) => {
    this.readFileImgUrls(e.target.files, (urls) => {
      // Get gif dimensions
      this.getImgSize(urls[0], (size) => this.setState({
        curImg: 0,
        imgs: urls,
        imgsEdited: urls,
        overlays: [],
        checked: Array(urls.length).fill(false),
        gifSize: size,
        gifFaceLayers: Array(urls.length).fill('back'),
        gifFaceScales: Array(urls.length).fill(0.5),
        gifXs: Array(urls.length).fill(parseInt(size.width / 2)),
        gifYs: Array(urls.length).fill(parseInt(size.height / 2)),
        gifRotations: Array(urls.length).fill(0),
      }, () => {
        this.updateAllImages();
        if (this.state.introStage === 1 && this.state.face)
          this.setState({ introStage: this.state.introStage + 1 });
      }))
    });
  }

  handleOverlaysUpload = (e) => {
    this.readFileImgUrls(e.target.files, (overlays) => this.setState({ overlays }));
  }

  handlePickSampleFace = async (name) => {
    const face = await this.readLocalAsUri('sample_faces/' + name + '.png');
    const faceCenters = await this.readLocalJSON('sample_faces/face_centers.json')
    this.getImgSize(face, (faceSize) => this.setState(
      { face, faceCenter: faceCenters[name], faceSize, },
      () => {
        this.updateAllImages();
        if (this.state.introStage === 1 && this.state.imgs.length > 0)
          this.setState({ introStage: this.state.introStage + 1 });
      }
    ));
  }

  handlePickSampleGif = async (name) => {
    const path = 'sample_gifs/' + name;

    // load images from the sample gif
    const imgs = [];
    const overlays = [];
    for (let i = 0; i < sampleGifCounts[name]; i++) {
      imgs[i] = await this.readLocalAsUri(path + '/images/' + i + '.png');
      overlays[i] = await this.readLocalAsUri(path + '/overlays/' + i + '.png');
    }

    // Get default properties
    const { gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales } = (
      await this.readLocalJSON(path + '/properties.json')
    );
    // const { gifXs, gifYs, gifRotations, gifFaceScales } = {
    //   gifFaceLayers: Array(imgs.length).fill('back'),
    //   gifFaceScales: Array(imgs.length).fill(0.5),
    //   gifXs: Array(imgs.length).fill(1),
    //   gifYs: Array(imgs.length).fill(1),
    //   gifRotations: Array(imgs.length).fill(0),
    // }

    // Get gif dimensions then update all images
    this.getImgSize(imgs[0], (size) => this.setState({
      curImg: 0,
      imgs,
      imgsEdited: imgs,
      overlays,
      checked: Array(imgs.length).fill(false),
      gifFaceLayers,
      gifXs,
      gifYs,
      gifRotations,
      gifFaceScales,
      gifSize: size,
    }, () => {
      this.updateAllImages();
      if (this.state.introStage === 1 && this.state.face)
        this.setState({ introStage: this.state.introStage + 1 });
    }));
  }

  handleIsOverlayOn = (e, c) => {
    this.setState({ isOverlayOn: c });
  }

  handleDownload = (e) => {
    const zip = new JSZip();
    const imgsEdited = this.state.imgsEdited;
    for (let i = 0; i < imgsEdited.length; i++) {
      const img = imgsEdited[i];
      const imgName = `img${i}.png`;
      zip.file(imgName, img.split(",")[1], { base64: true });
    }
    zip.generateAsync({ type: "blob" }).then(function (content) {
      FileSaver.saveAs(content, "epic_edited_gif.zip");
    });
  }

  outputProperties = () => {
    const { faceCenter, gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales } = this.state;
    console.log(JSON.stringify({ faceCenter, gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales }));
  }

  readLocalJSON = async (file) => {
    const response = await fetch(file);
    const blob = await response.blob();
    const text = await blob.text();
    return JSON.parse(text);
  }

  readFileImgUrls(files, callback) {
    if (!files)
      return;

    // Store promises in array
    let readers = [];
    for(const file of files)
      readers.push(this.readFile(file));
    
    // Trigger Promises
    Promise.all(readers).then(callback);
  }

  async readLocalAsUri(file) {
    const response = await fetch(file);
    const blob = await response.blob();
    const data = await this.readFile(blob);
    return data;
  }
  
  readFile(file) {
    return new Promise(function (resolve, reject) {
      const fr = new FileReader();
      fr.onload = function(){ resolve(fr.result) };
      fr.onerror = function(){ reject(fr) };
      fr.readAsDataURL(file);
    });
  }

  fetchEditedImg = async (...indexes) => {
    if (this.state.face === null || this.state.imgs.length === 0)
      return;
    
    if (indexes.length === 0)
      indexes.push(this.state.curImg);
    
    const face = this.state.face;
    const faceCenter = this.state.faceCenter;
    const faceSize = this.state.faceSize;
    const gifSize = this.state.gifSize;

    let faceScaleSize = {};
    let newImgsEdited = cloneDeep(this.state.imgsEdited);
    for (let i of indexes) {
      if (this.state.gifFaceLayers[i] === 'hide') {
        newImgsEdited[i] = this.state.imgs[i];
        continue;
      }

      const scale = this.state.gifFaceScales[i];
      if (faceSize.width / faceSize.height > gifSize.width / gifSize.height) {
        faceScaleSize.width = gifSize.width * scale;
        faceScaleSize.height = faceSize.height * (gifSize.width / faceSize.width) * scale;
      }
      else {
        faceScaleSize.height = gifSize.height * scale;
        faceScaleSize.width = faceSize.width * (gifSize.height / faceSize.height) * scale;
      }
      
      let data = new FormData();
      data.append('face', face);
      data.append('image', this.state.imgs[i]);
      data.append('faceSize', JSON.stringify(faceSize));
      data.append('gifSize', JSON.stringify(gifSize));
      data.append('faceScaleSize', JSON.stringify(faceScaleSize));
      data.append('faceCenter', JSON.stringify(faceCenter));
      data.append('facePos', JSON.stringify({ x: this.state.gifXs[i], y: this.state.gifYs[i] }));
      data.append('faceRot', JSON.stringify(this.state.gifRotations[i]));
      data.append('faceLayer', JSON.stringify(this.state.gifFaceLayers[i]));
      
      const response = await fetch('/testAPI', { method: "POST", body: data });
      if (!response.ok) return;
      newImgsEdited[i] = await response.text();
    }
    this.setState({ faceScaleSize });
    this.setState({ imgsEdited: newImgsEdited });
  }

  updateAllImages = () => {
    this.fetchEditedImg(...this.state.imgs.keys());
  }

  // Update current image
  // And update checked images also if other images are checked
  onImgAttrChange = (arrayName, val) => {
    const curImg = this.state.curImg;
    if (this.state.checked.every((v) => v === false)) {
      if (arrayName === 'positions') {
        const newGifXs = cloneDeep(this.state.gifXs);
        const newGifYs = cloneDeep(this.state.gifYs);
        newGifXs[curImg] = val.x;
        newGifYs[curImg] = val.y;
        this.setState({ gifXs: newGifXs, gifYs: newGifYs }, () => this.fetchEditedImg(curImg));
      }
      else {
        const newArray = cloneDeep(this.state[arrayName]);
        newArray[curImg] = val;
        this.setState({ [arrayName]: newArray }, () => this.fetchEditedImg(curImg));
      }
    }
    else {
      // Check current image
      const newChecked = cloneDeep(this.state.checked);
      newChecked[curImg] = true;
      this.setState({ checked: newChecked });

      // Get indexes of checked images
      // Aka get indexes of true elements in checked array
      const indexes = newChecked.reduce((a, check, i) => (check ? a.concat(i) : a), []);

      if (arrayName === 'positions') {
        const newGifXs = cloneDeep(this.state.gifXs);
        const newGifYs = cloneDeep(this.state.gifYs);
        for (const i of indexes) {
          newGifXs[i] = val.x;
          newGifYs[i] = val.y;
        }
        this.setState({ gifXs: newGifXs, gifYs: newGifYs }, () => this.fetchEditedImg(...indexes));
      }
      else {
        const newArray = cloneDeep(this.state[arrayName]);
        for (const i of indexes)
          newArray[i] = val;
        this.setState({ [arrayName]: newArray }, () => this.fetchEditedImg(...indexes));
      }
    }
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

  handleClickImage = (clickedImg) => {
    const curImg = this.state.curImg;
    if (this.state.shiftDown) {
      const newChecked = cloneDeep(this.state.checked);
      for (let i = curImg; i !== clickedImg; i += curImg < clickedImg ? 1 : -1)
        newChecked[i] = true;
      newChecked[clickedImg] = true;
      this.setState({ checked: newChecked });
    }
    else if (this.state.commandDown) {
      const newChecked = cloneDeep(this.state.checked);
      newChecked[clickedImg] = !newChecked[clickedImg];
      this.setState({ checked: newChecked });
    }
    else {
      this.setState({ curImg: clickedImg });
    }
  }
  
  handleCheck = (i, e) => {
    const newChecked = cloneDeep(this.state.checked);
    newChecked[i] = e.target.checked;
    if (e.target.checked)
      newChecked[this.state.curImg] = true;
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

  renderIntroModal() {
    const introStage = this.state.introStage;
    if (introStage === 0)
      return <InfoModal startOpen {...infoModalText['welcome']} onClose={() => this.setState({ introStage: introStage + 1 })}/>;
    else if (introStage === 2)
      return <InfoModal startOpen {...infoModalText['basics']} onClose={() => this.setState({ introStage: introStage + 1 })}/>;
  }

  renderFace() {
    if (this.state.face === null) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <UploadButton type='face' text='Set Face' onUpload={this.handleFaceUpload} onPickSample={this.handlePickSampleFace} disabled={this.state.playIntervalId !== null} />
        </Box>
      );
    }
    else {
      return (
        <FaceCenterer
          src={this.state.face}
          size={this.state.faceSize}
          pos={this.state.faceCenter}
          onCenterChange={(center) => this.setState({ faceCenter: center }, this.updateAllImages)}
          onFaceUpload={this.handleFaceUpload}
          onPickSample={this.handlePickSampleFace}
          disabled={this.state.playIntervalId !== null}
        />
      );
    }
  }

  renderCurImg() {
    if (this.state.imgs.length === 0) {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <UploadButton type='gif' text='Set Gif Images' onUpload={this.handleImagesUpload} onPickSample={this.handlePickSampleGif} />
        </Box>
      );
    }
    else {
      const curImg = this.state.curImg;
      return (
        <ImageEditor
          src={this.state.imgsEdited[curImg]}
          overlay={this.state.overlays[curImg]}
          isOverlayOn={this.state.isOverlayOn}
          faceLayer={this.state.gifFaceLayers[curImg]}
          faceScaleSize={this.state.faceScaleSize}
          size={this.state.gifSize}
          x={this.state.gifXs[curImg]}
          y={this.state.gifYs[curImg]}
          scale={this.state.gifFaceScales[curImg]}
          rotation={this.state.gifRotations[curImg]}
          onFaceLayerChange={(layer) => this.onImgAttrChange('gifFaceLayers', layer)}
          onXChange={(x) => this.onImgAttrChange('gifXs', x)}
          onYChange={(y) => this.onImgAttrChange('gifYs', y)}
          onPosChange={(pos) => this.onImgAttrChange('positions', pos)}
          onScaleChange={(scale) => {if (scale !== 0) this.onImgAttrChange('gifFaceScales', scale)}}
          onRotateChange={(deg) => this.onImgAttrChange('gifRotations', deg)}
          onOverlayChange={this.handleIsOverlayOn}
          onOverlaysUpload={this.handleOverlaysUpload}
          onImagesUpload={this.handleImagesUpload}
          onPickSample={this.handlePickSampleGif}
          disabled={this.state.playIntervalId !== null}
          key={curImg} // jank?
        />
      );
    }
  }

  renderScroll() {
    if (this.state.imgsEdited.length !== 0) {
      let selectButton;
      const allChecked = this.state.checked.every((val) => val === true);
      selectButton = (
        <Button
          component="label"
          variant="outlined"
          onClick={allChecked ? this.handleUncheckAll : this.handleCheckAll}
          sx={{ borderRadius: 100 }}
          disabled={this.state.playIntervalId !== null}
        >
          {allChecked ? 'Unselect' : 'Select'} All
        </Button>
      );

      const infoModalText = {
        title: 'Frames Selection',
        body: (
          <Typography variant="body1" component="p">
            Click a frame to edit it.
            <br/><br/>You can also select multiple frames by clicking the checkbox in the top right corner of each frame, or by shift/command-clicking.
            <br/><br/>Play and download your gif in the bottom left corner!
          </Typography>
        ),
        button: 'Got it!',
      };

      return <>
        <Stack sx={{ position: 'absolute', zIndex: 2, bottom: 32 }} spacing={2} direction="row" alignItems="center">
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            <IconButton
              component="label"
              variant="outlined"
              onClick={this.handlePlayPause}
              sx={{ borderRadius: 100 }}
            >
              {this.state.playIntervalId ? <PauseIcon color='primary' /> : <PlayArrowIcon color='primary' />}
            </IconButton>
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            <IconButton
              component="label"
              variant="outlined"
              onClick={this.handleDownload}
              sx={{ borderRadius: 100 }}
              disabled={this.state.playIntervalId !== null}
            >
              <DownloadIcon color={this.state.playIntervalId ? 'default' : 'primary'} />
            </IconButton>
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            {selectButton}
          </Paper>
        </Stack>
        <Box sx={{ height: '100%', whiteSpace: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }}>
          {this.state.imgsEdited.map((image, index) => (this.renderScrollImg(index)))}
        </Box>
        <InfoModal hasButton buttonBackground {...infoModalText}/>
      </>
    }
  }

  render() {
    const introModal = this.renderIntroModal();
    const face = this.renderFace();
    const curImg = this.renderCurImg();
    const scroll = this.renderScroll();
    return (
      <div className="App">
        <CssBaseline />
        <Grid container columnSpacing={2} sx={{ p: 2, height: '100vh' }}>
          <Grid item xs={6} sx={{ height: '80%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {face}
            </Paper>
          </Grid>
          <Grid item xs={6} sx={{ height: '80%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {curImg}
            </Paper>
          </Grid>
          <Grid item xs={12} sx={{ height: 'calc(20% - 16px)', mt: 2 }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {scroll}
            </Paper>
          </Grid>
        </Grid>
        <DebugModal onOutputProperties={this.outputProperties} />
        {introModal}
      </div>
    );
  }
}
