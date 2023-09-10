import React from 'react';
import './App.css';
// import JSZip from 'jszip';
import FileSaver from 'file-saver';

import DebugModal from './Components/DebugModal.jsx';
import FaceCenterer from './Components/FaceCenterer.jsx';
import ImageEditor from './Components/ImageEditor.jsx';
import InfoModal from './Components/InfoModal.jsx';
import UploadButton from './Components/UploadButton.jsx';
import { sampleGifCounts } from './Constants.js';

import CssBaseline from '@mui/material/CssBaseline';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
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

// Text for Welcome Tutorial/Popups
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
        Drag the face or use buttons to move, scale, and rotate your face.
        <br/><br/>When you are done, download your gif in the bottom left corner!
      </Typography>
    ),
    button: 'Got it!',
  },
}

// Superlatives for file names for output/downloaded gifs
const superlatives = [
  "amazing",
  "awesome",
  "fantastic",
  "incredible",
  "outstanding",
  "remarkable",
  "spectacular",
  "terrific",
  "wonderful",
  "extraordinary",
  "juicy",
  "spicy",
  "saucy",
  "ROTFLOL",
  "fire",
  "giffy",
  "epic",
  "gif-tastic",
];

/**
 * Single-page app
 */
export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      introStage: 0, // stage of intro/tutorial, 0: welcome intro, 1: blank, 2: info after setting face & gif, 3: blank
      face: null, // URI of face
      imgs: [], // original images URI's
      imgsEdited: [], // edited images URI's
      curImg: null, // index of current image the user is editing
      overlays: [], // overlays URI's. Overlays help the user edit easily
      isOverlayOn: false,
      checked: [], // indexes of checked images. For applying transforms to multiple frames at once
      shiftDown: false, // for shift key. Select a range of frames to edit.
      commandDown: false, // for command key. Select multiple frames to edit.
      faceSize: null, // face size in pixels
      faceScaleSize: null, // scaled face size in pixels. The face is scaled to fill the gif image by default.
      gifSize: null, // gif size/dimensions in pixels
      faceCenter: null, // center/anchor position on face in pixels
      gifFaceLayers: null, // layer of face in each gif image, front/back/hide relative to gif
      gifXs: null, // x position of face in each gif image
      gifYs: null, // y position of face in each gif image
      gifFaceScales: null, // compounding scale for face in each gif image
      gifRotations: null, // rotation of face in each gif image (degrees)
      playIntervalId: null, // interval for playing gif
      isLoading: false, // for loading spinner for applying updates/changing face or gif
    };
    this.curImgRef = React.createRef(); // for scrolling to current image
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
    // if (event.key === 'Shift')
    //   this.setState({ shiftDown: true });
    // if (event.key === 'Meta')
    //   this.setState({ commandDown: true });

    // Scroll through frames with arrow keys
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
    // if (event.key === 'Shift')
    //   this.setState({ shiftDown: false });
    // if (event.key === 'Meta')
    //   this.setState({ commandDown: false });
  }

  setIsLoading = (isLoading) => this.setState({ isLoading });

  /**
   * Toggle playing/pausing the edited frames/gif in editor
   */
  handlePlayPause = (event) => {
    if (this.state.playIntervalId) {
      // Pause
      clearInterval(this.state.playIntervalId);
      this.setState({
        playIntervalId: null,
      });
    }
    else {
      // Play, start at first frame & run through the frames
      // Scroll the frames list accordingly
      const imgsLength = this.state.imgs.length;
      this.setState({
        curImg: 0,
        playIntervalId: setInterval(() => {
            this.setState({ curImg: (this.state.curImg + 1) % imgsLength }, this.scrollIntoView);
        }, 100),
      });
    }
  }

  // Scroll frames list to current image
  scrollIntoView = () => this.curImgRef.current.scrollIntoView();

  /**
   * Upload custom face file
   * @param {Object} e event object holding uploaded face file
   */
  handleFaceUpload = (e) => {
    this.setIsLoading(true);
    // Read URI from upload
    this.readFileImgUrls(e.target.files, (urls) => {
      const face = urls[0];
      // Get face dimensions then set face info
      this.getImgSize(face, (size) => this.setState({
        face,
        faceSize: size,
        faceCenter: { x: size.width / 2, y: size.height / 2 },
      }, () => {
        // Then update the face into all images
        this.updateAllImages();
        // If in intro & user has already set a gif, go to next stage of intro
        if (this.state.introStage === 1 && this.state.imgs.length > 0)
          this.setState({ introStage: this.state.introStage + 1 });
      }));
    });
  }

  /**
   * Upload custom gif by its frames
   * @param {Object} e event object holding uploaded gif frames
   */
  handleImagesUpload = async (e) => {
    this.setIsLoading(true);
    this.readFileImgUrls(e.target.files, (urls) => {
      // Get gif dimensions & initialize images and default properties
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
        // If in intro & user has already set a face, go to next stage of intro
        if (this.state.introStage === 1 && this.state.face)
          this.setState({ introStage: this.state.introStage + 1 });
      }))
    });
  }

  /**
   * Upload custom overlay by its frames
   * Overlays help the user place the face easily
   * @param {Object} e event object holding uploaded overlay frames
   */
  handleOverlaysUpload = (e) => {
    this.setIsLoading(true);
    this.readFileImgUrls(e.target.files, (overlays) => this.setState({ overlays }));
  }

  /**
   * Select a sample face
   * @param {string} name face file name
   */
  handlePickSampleFace = async (name) => {
    this.setIsLoading(true);
    // Get face URI
    const face = await this.readLocalAsUri('sample_faces/' + name + '.png');
    // Load face center preset
    const faceCenters = await this.readLocalJSON('sample_faces/face_centers.json')
    // Get face dimensions then set face info
    this.getImgSize(face, (faceSize) => this.setState(
      { face, faceCenter: faceCenters[name], faceSize, },
      // // For making more sample faces' default properties
      // { face, faceCenter: { x: 0, y: 0 }, faceSize, },

      () => {
        this.updateAllImages();
        // If in intro & user has already set a gif, go to next stage of intro
        if (this.state.introStage === 1 && this.state.imgs.length > 0)
          this.setState({ introStage: this.state.introStage + 1 });
      }
    ));
  }

  /**
   * Select a sample gif
   * @param {string} name gif name
   */
  handlePickSampleGif = async (name) => {
    this.setIsLoading(true);
    const path = 'sample_gifs/' + name;

    // load images and overlays from the sample gif
    const imgs = [];
    const overlays = [];
    for (let i = 0; i < sampleGifCounts[name]; i++) {
      imgs[i] = await this.readLocalAsUri(path + '/images/' + i + '.png');
      overlays[i] = await this.readLocalAsUri(path + '/overlays/' + i + '.png');
    }

    // Get properties presets
    const { gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales } = (
      await this.readLocalJSON(path + '/properties.json')
    );
    // // For making more sample gifs' default properties
    // const { gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales } = {
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
      // If in intro & user has already set a face, go to next stage of intro
      if (this.state.introStage === 1 && this.state.face)
        this.setState({ introStage: this.state.introStage + 1 });
    }));
  }

  handleIsOverlayOn = (e, c) => {
    this.setState({ isOverlayOn: c });
  }

  /**
   * Output edited gif to download
   */
  handleDownload = async (e) => {
    this.setIsLoading(true);
    if (this.state.imgs.length === 0) {
      // Stop loading circle
      this.setIsLoading(false);
      return;
    }
    
    // Send frames to server to compile into a single gif file
    let data = new FormData();
    data.append('images', JSON.stringify(this.state.imgsEdited));
    data.append('gifSize', JSON.stringify(this.state.gifSize));
    
    const response = await fetch('/imagesToGif', { method: "POST", body: data });
    if (!response.ok) {
      // Stop loading circle
      this.setIsLoading(false);
      return;
    }
    const gifURI = await response.text();
    
    // Download gif with a special randomized name
    const randomSuperlative = superlatives[Math.floor(Math.random() * superlatives.length)];
    FileSaver.saveAs(gifURI, `${randomSuperlative} gif.gif`);
    this.setIsLoading(false);

    // // Download zip of frames
    // const zip = new JSZip();
    // const imgsEdited = this.state.imgsEdited;
    // for (let i = 0; i < imgsEdited.length; i++) {
    //   const img = imgsEdited[i];
    //   const imgName = `img${i}.png`;
    //   zip.file(imgName, img.split(",")[1], { base64: true });
    // }
    // zip.generateAsync({ type: "blob" }).then(function (content) {
    //   FileSaver.saveAs(content, "epic_edited_gif.zip");
    // });
  }

  /**
   * Output edited gif properties to console for making more sample gif presets
   */
  outputProperties = () => {
    const { faceCenter, gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales } = this.state;
    console.log(JSON.stringify({ faceCenter, gifFaceLayers, gifXs, gifYs, gifRotations, gifFaceScales }));
  }

  /**
   * Parse a JSON file from local storage
   * @param {string} file 
   * @returns parsed JSON object
   */
  readLocalJSON = async (file) => {
    const response = await fetch(file);
    const blob = await response.blob();
    const text = await blob.text();
    return JSON.parse(text);
  }

  /**
   * Read image files and return URI's
   * @param {string[]} files list of files
   * @param {callback} callback when done with all files
   * @returns 
   */
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

  /**
   * Read local image file's URI
   * @param {string} file 
   * @returns URI of image file
   */
  async readLocalAsUri(file) {
    const response = await fetch(file);
    const blob = await response.blob();
    const data = await this.readFile(blob);
    return data;
  }
  
  /**
   * Read URI from an image file
   * @param {string} file 
   * @returns URI of image file
   */
  readFile(file) {
    return new Promise(function (resolve, reject) {
      const fr = new FileReader();
      fr.onload = function(){ resolve(fr.result) };
      fr.onerror = function(){ reject(fr) };
      fr.readAsDataURL(file);
    });
  }

  /**
   * Request edited images from server
   * Edit multiple indexes or if no index provided, edit current image
   * @param  {...number} indexes indexes of images to update
   */
  fetchEditedImg = async (...indexes) => {
    // If no face or no images, return
    if (this.state.face === null || this.state.imgs.length === 0) {
      // Stop loading circle
      this.setIsLoading(false);
      return;
    }
    
    // If no indexes provided, update current image
    if (indexes.length === 0)
      indexes.push(this.state.curImg);
    
    const face = this.state.face;
    const faceCenter = this.state.faceCenter;
    const faceSize = this.state.faceSize;
    const gifSize = this.state.gifSize;

    let faceScaleSize = {};
    // Hold edited images then update state when all are edited.
    let newImgsEdited = cloneDeep(this.state.imgsEdited);
    for (let i of indexes) {
      // If face is hidden, don't edit
      if (this.state.gifFaceLayers[i] === 'hide') {
        newImgsEdited[i] = this.state.imgs[i];
        continue;
      }

      // Scale face. By default with scale of 1, fit the gif.
      const scale = this.state.gifFaceScales[i];
      if (faceSize.width / faceSize.height > gifSize.width / gifSize.height) {
        // If face is wider than gif, scale by width
        faceScaleSize.width = gifSize.width * scale;
        faceScaleSize.height = faceSize.height * (gifSize.width / faceSize.width) * scale;
      }
      else {
        // If face is taller than gif, scale by height
        faceScaleSize.height = gifSize.height * scale;
        faceScaleSize.width = faceSize.width * (gifSize.height / faceSize.height) * scale;
      }
      
      // Send request to server to edit image
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
      
      const response = await fetch('/editImage', { method: "POST", body: data });
      if (!response.ok) {
        // Stop loading circle
        this.setIsLoading(false);
        return;
      }
      newImgsEdited[i] = await response.text();
    }

    // Update images
    // Must aggregate updated images then set all at once
    // Otherwise, the array will be changed at the same time without synchronization
    // And not all images will be updated
    this.setState({ faceScaleSize });
    this.setState({ imgsEdited: newImgsEdited });

    // Stop loading circle
    this.setIsLoading(false);
  }

  // Send request to server to update all images
  updateAllImages = () => {
    this.fetchEditedImg(...this.state.imgs.keys());
  }

  /**
   * Update a property of the current image and any other checked images
   * And update the image(s)
   * @param {string} arrayName 
   * @param {any} val 
   */
  onImgAttrChange = (arrayName, val) => {
    this.setIsLoading(true);

    const curImg = this.state.curImg;
    if (this.state.checked.every((v) => v === false)) {
      // No checked images, update only current image
      if (arrayName === 'positions') {
        // For face positions, handle x and y separately
        const newGifXs = cloneDeep(this.state.gifXs);
        const newGifYs = cloneDeep(this.state.gifYs);
        newGifXs[curImg] = val.x;
        newGifYs[curImg] = val.y;
        this.setState({ gifXs: newGifXs, gifYs: newGifYs }, () => this.fetchEditedImg(curImg));
      }
      else {
        // For other properties, just update
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
        // For face positions, update x and y separately so setting x doesn't set y for all checked images too and vice versa
        const newGifXs = cloneDeep(this.state.gifXs);
        const newGifYs = cloneDeep(this.state.gifYs);
        for (const i of indexes) {
          newGifXs[i] = val.x;
          newGifYs[i] = val.y;
        }
        this.setState({ gifXs: newGifXs, gifYs: newGifYs }, () => this.fetchEditedImg(...indexes));
      }
      else {
        // For other properties, update all checked images
        const newArray = cloneDeep(this.state[arrayName]);
        for (const i of indexes)
          newArray[i] = val;
        this.setState({ [arrayName]: newArray }, () => this.fetchEditedImg(...indexes));
      }
    }
  }

  /**
   * Get image size in pixels
   * @param {string} src URI for image
   * @param {callback} callback when done getting image dimensions
   */
  getImgSize(src, callback) {
    const image = new Image();
    image.onload = function() {
      const height = image.height;
      const width = image.width;
      callback({ width, height });
    };
    image.src = src; // this must be done AFTER setting onload
  }

  /**
   * Select image(s) in frames list/scrollbar
   * @param {number} clickedImg index of clicked image
   */
  handleClickImage = (clickedImg) => {
    const curImg = this.state.curImg;
    if (this.state.shiftDown) {
      // Check a range of images
      const newChecked = cloneDeep(this.state.checked);
      for (let i = curImg; i !== clickedImg; i += curImg < clickedImg ? 1 : -1)
        newChecked[i] = true;
      newChecked[clickedImg] = true;
      this.setState({ checked: newChecked });
    }
    else if (this.state.commandDown) {
      // Check/uncheck another image
      const newChecked = cloneDeep(this.state.checked);
      newChecked[clickedImg] = !newChecked[clickedImg];
      this.setState({ checked: newChecked });
    }
    else {
      // Select the clicked image
      this.setState({ curImg: clickedImg });
    }
  }
  
  /**
   * Check/uncheck a frame
   * @param {number} i index of checked/unchecked image
   * @param {object} e event object
   */
  handleCheck = (i, e) => {
    const newChecked = cloneDeep(this.state.checked);
    newChecked[i] = e.target.checked;
    if (e.target.checked)
      newChecked[this.state.curImg] = true;
    this.setState({ checked: newChecked });
  }

  /**
   * Check all frames
   */
  handleCheckAll = () => {
    this.setState({ checked: Array(this.state.imgs.length).fill(true) });
  }

  /**
   * Uncheck all frames
   */
  handleUncheckAll = () => {
    this.setState({ checked: Array(this.state.imgs.length).fill(false) });
  }

  /**
   * Render a frame in the frames list/scrollbar
   * @param {number} i index of image
   * @returns jsx for frame
   */
  renderScrollImg(i) {
    // If current image, highlight border
    // And create ref to scroll to image
    let borderCol, ref;
    if (this.state.curImg === i) {
      borderCol = 'yellow';
      ref = this.curImgRef;
    }

    const checkbox = (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      >
        <Checkbox checked={this.state.checked[i]} onChange={(e) => this.handleCheck(i, e)} />
      </Box>
    );

    const frameNumberBorder = (
      <Paper
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          // transform: 'translate(-50%, -50%)',
          // borderRadius: 100,
          // opacity: 0.7,
          // p: 0.5,
          width: i + 1 < 10 ? 19 : 30,
          height: 24,
          borderColor: borderCol,
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: 0,
        }}
        elevation={0}
      >
      </Paper>
    );

    const frameNumber = (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 5,
        }}
      >
        {i + 1}
      </Box>
    );
    
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', mr: 1, height: '100%' }} key={i}>
        <Box
          component='img'
          src={this.state.imgsEdited[i]}
          alt={'image ' + i}
          loading='lazy'
          sx={{ height: '100%', borderColor: borderCol, borderWidth: 2, borderStyle: 'solid' }}
          onClick={() => this.handleClickImage(i)}
          ref={ref}
        />
        {checkbox}
        {frameNumberBorder}
        {frameNumber}
      </Box>
    );
  }

  /**
   * Render the intro/tutorial popups
   * @returns jsx for intro popup
   */
  renderIntroModal() {
    const introStage = this.state.introStage;
    if (introStage === 0)
      return <InfoModal startOpen {...infoModalText['welcome']} onClose={() => this.setState({ introStage: introStage + 1 })}/>;
    else if (introStage === 2)
      return <InfoModal startOpen {...infoModalText['basics']} onClose={() => this.setState({ introStage: introStage + 1 })}/>;
  }

  /**
   * Render the face section
   * @returns jsx for face section
   */
  renderFace() {
    if (this.state.face === null) {
      // If no face is set, show upload button
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <UploadButton type='face' text='Set Face' onUpload={this.handleFaceUpload} onPickSample={this.handlePickSampleFace} disabled={this.state.playIntervalId !== null} />
          <img src='click-subscribe.gif' alt='click above' width='64' style={{ marginTop: 20 }}/>
        </Box>
      );
    }
    else {
      // If face is set, show face editor
      return (
        <FaceCenterer
          src={this.state.face}
          size={this.state.faceSize}
          pos={this.state.faceCenter}
          onCenterChange={(center) => { this.setIsLoading(true); this.setState({ faceCenter: center }, this.updateAllImages) }}
          onFaceUpload={this.handleFaceUpload}
          onPickSample={this.handlePickSampleFace}
          disabled={this.state.playIntervalId !== null}
        />
      );
    }
  }

  /**
   * Render the gif section
   * @returns jsx for gif section
   */
  renderCurImg() {
    if (this.state.imgs.length === 0) {
      // If no gif is set, show upload button
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <UploadButton type='gif' text='Set Gif' onUpload={this.handleImagesUpload} onPickSample={this.handlePickSampleGif} />
          <img src='click-subscribe.gif' alt='click above' width='64' style={{ marginTop: 20 }}/>
        </Box>
      );
    }
    else {
      // If gif is set, show frame/image editor
      const curImg = this.state.curImg;
      return (
        <ImageEditor
          frameNumber={curImg + 1}
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

  /**
   * Render the frames list/scrollbar
   * @returns jsx for frames list/scrollbar
   */
  renderScroll() {
    // Make sure there are images
    if (this.state.imgsEdited.length !== 0) {
      const playPauseButton = (
        <IconButton
          component="label"
          variant="outlined"
          onClick={this.handlePlayPause}
          sx={{ borderRadius: 100 }}
        >
          {this.state.playIntervalId ? <PauseIcon color='primary' /> : <PlayArrowIcon color='primary' />}
        </IconButton>
      );

      // Button to check/uncheck all frames
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

      const downloadButton = (
        <IconButton
          component="label"
          variant="outlined"
          onClick={this.handleDownload}
          sx={{ borderRadius: 100 }}
          disabled={this.state.playIntervalId !== null}
        >
          <DownloadIcon color={this.state.playIntervalId ? 'default' : 'primary'} />
        </IconButton>
      );

      // Info popup text
      const infoModalText = {
        title: 'Frames Selection',
        body: (
          <Typography variant="body1" component="p">
            Click a frame to edit it.
            <br/><br/>Select multiple frames clicking checkboxes in the top right corner of each frame, or by shift/command-clicking.
            <br/><br/>Play and download your gif in the bottom left corner!
          </Typography>
        ),
        button: 'Got it!',
      };

      const scroll = (
        <Box sx={{ height: '100%', whiteSpace: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }}>
          {this.state.imgsEdited.map((image, index) => (this.renderScrollImg(index)))}
        </Box>
      );

      return <>
        <Stack sx={{ position: 'absolute', zIndex: 2, bottom: 32 }} spacing={2} direction="row" alignItems="center">
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            {playPauseButton}
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            {downloadButton}
          </Paper>
          <Paper sx={{ borderRadius: 100 }} elevation={4}>
            {selectButton}
          </Paper>
        </Stack>
        {scroll}
        <InfoModal hasButton buttonBackground {...infoModalText}/>
      </>
    }
  }

  /**
   * Render app
   * @returns jsx for the whole app
   */
  render() {
    const introModal = this.renderIntroModal();
    const faceSection = this.renderFace();
    const curImgEditor = this.renderCurImg();
    const scroll = this.renderScroll();
    // Spinning wheel when loading face/gif/uploading/changing properties
    const loadingScreen = (
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={this.state.isLoading}
        onClick={() => this.setIsLoading(false)}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
    return (
      <div className="App">
        <CssBaseline />
        <Grid container columnSpacing={2} sx={{ p: 2, height: '100vh' }}>
          <Grid item xs={6} sx={{ height: '80%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {faceSection}
            </Paper>
          </Grid>
          <Grid item xs={6} sx={{ height: '80%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {curImgEditor}
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
        {loadingScreen}
      </div>
    );
  }
}
