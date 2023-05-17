import React from 'react';
import './App.css';
import Draggable from 'react-draggable';

import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
// import Typography from '@mui/material/Typography';

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
        style={{borderColor: 'black', borderWidth: 2, borderStyle: 'solid'}}
      />];
      const screenSize = this.state.screenSize;
      const screenPos = this.state.screenPos;
      if (screenSize != null) {
        anchoredImage.push(
          <Draggable
            handle=".handle"
            key='anchor'
            position={this.actualToScreen(this.state.anchor)}
            bounds={{left: 0, top: 0, right: screenSize.width, bottom: screenSize.height}}
            onStop={(e, data) => this.handleDragStop(e, data)}
          >
            <AnchorIcon className='handle' key='anchor' sx={{ position: 'absolute', top: screenPos.y, left: screenPos.x }}/>
          </Draggable>
        );
      }
      return anchoredImage;
    }
  }
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      face: '',
      imgs: [],
      imgsEdited: [],
      selectedImg: null,
      faceAnchor: null,
      faceSize: null,
      faceScreenSize: null,
      gifSize: null,
      gifAnchors: [],
    };
  }

  handleFaceUpload(e) {
    e.preventDefault();
    if (!e.target.files)
      return;
    
    const file = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    const self = this;
    fileReader.addEventListener("load", function () {
      self.setState({ face: this.result });
      // Get gif dimensions
      self.getImgSize(this.result, (size) => self.setState({
        faceSize: size,
        faceAnchor: { x: size.width / 2, y: size.height / 2 },
      }, () => self.fetchEditedImg(0)));
    });
  }

  async handleImagesUpload(e) {
    e.preventDefault();
    const files = e.target.files;
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
    Promise.all(readers).then((urls) => {
      // Add uploaded images
      let newImgs = cloneDeep(this.state.imgs);
      for (const url of urls)
        newImgs.push(url);
      this.setState({ imgs: newImgs, imgsEdited: newImgs })

      // Get gif dimensions
      this.getImgSize(urls[0], (size) => this.setState({
        gifSize: size,
        gifAnchors: Array(urls.length).fill({ x: size.width / 2, y: size.height / 2 }),
      }, () => this.fetchEditedImg(0)));

      // Select first image if first upload
      if (this.state.selectedImg == null)
        this.setState({ selectedImg: 0 });
    });



    // let data = new FormData()
    // for (const file of files)
    //   data.append('images', file)

    // const response = await fetch('/testAPI', {
    //   method: "POST",
    //   body: data,
    // });
    // if (!response.ok)
    //   return;

    // let newImgs = cloneDeep(this.state.imgs);
    // const imgs = await response.json();
    // for (const img of imgs)
    //   newImgs.push(img);
    // this.setState({ imgs: newImgs, imgsEdited: newImgs })
    // this.setState({ selectedImg: 0 });
    // this.getImgSize(imgs[0], (size) => this.setState({
    //   gifSize: size,
    //   gifAnchors: Array(imgs.length).fill({ x: size.width / 2, y: size.height / 2 }),
    // }, () => this.fetchEditedImg(0)));
  }

  async fetchEditedImg(i) {
    if (this.state.faceSize == null || this.state.gifSize == null)
      return;
    
    let data = new FormData();
    data.append('face', this.state.face);
    data.append('image', this.state.imgs[i]);
    data.append('faceAnchor', JSON.stringify(this.state.faceAnchor));
    data.append('imageAnchor', JSON.stringify(this.state.gifAnchors[i]));

    const response = await fetch('/testAPI', {
      method: "POST",
      body: data,
    });
    if (!response.ok)
      return;

    let newImgsEdited = cloneDeep(this.state.imgsEdited);
    newImgsEdited[i] = await response.text();
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
    if (this.state.faceSize == null) {
      return '';
    }
    else {
      return <AnchoredImage
        imageName='face'
        src={this.state.face}
        size={this.state.faceSize}
        anchor={this.state.faceAnchor}
        onAnchorChange={(anchor) => {
          this.setState({ faceAnchor: anchor });
          this.fetchEditedImg(this.state.selectedImg);
        }}
      />;
    }
  }

  renderSelectedImg() {
    if (this.state.gifSize == null) {
      return '';
    }
    else {
      const selectedImg = this.state.selectedImg;
      return <AnchoredImage
        imageName='selected'
        src={this.state.imgsEdited[selectedImg]}
        size={this.state.gifSize}
        anchor={this.state.gifAnchors[selectedImg]}
        onAnchorChange={(anchor) => {
          let newGifAnchors = cloneDeep(this.state.gifAnchors);
          newGifAnchors[selectedImg] = anchor;
          this.setState({ gifAnchors: newGifAnchors })
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
                  Upload Images
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => this.handleImagesUpload(e)} />
                </Button>
              </Box>
              {face}
            </Paper>
          </Grid>
          <Grid item xs={5} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%' }} elevation={4}>
              {selectedImg}
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
