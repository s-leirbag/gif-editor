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

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      face: '',
      images: [],
      selectedImg: null,
      faceAnchor: { x: 0, y: 0 },
      faceSize: { width: 0, height: 0 },
      faceScreenSize: null,
      gifSize: { width: 0, height: 0 },
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
      }));
    });
  }

  handleImagesUpload(e) {
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
      let newImages = cloneDeep(this.state.images);
      for (const url of urls)
        newImages.push(url);
      this.setState({ images: newImages })

      // Get gif dimensions
      this.getImgSize(urls[0], (size) => this.setState({ gifSize: size }));

      // Select first image if first upload
      if (this.state.selectedImg == null)
        this.setState({ selectedImg: 0 });
    });
    
    // let data = new FormData()
    // for (const file of e.target.files)
    //   data.append('images', file)

    // const response = await fetch('/testAPI', {
    //   method: "POST",
    //   body: data,
    // });
    // if (!response.ok)
    //   return;

    // let newImages = cloneDeep(this.state.images);
    // const images = await response.json();
    // for (const image of images)
    //   newImages.push(image);
    // this.setState({ images: newImages })
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
    if (this.state.selectedImg === i) {
      bgCol = 'yellow';
    }
    
    return (
      <Box
        component='img'
        key={i}
        src={this.state.images[i]}
        alt={'image ' + i}
        loading='lazy'
        sx={{ width: '100%', borderColor: bgCol, borderWidth: 2, borderStyle: 'solid' }}
        onClick={() => this.handleClickImage(i)}
      />
    );
  }

  handleDragStop(e, data) {
    const faceScreenSize = this.state.faceScreenSize;
    const faceSize = this.state.faceSize;
    const x = data.x * faceSize.width / faceScreenSize.width;
    const y = data.y * faceSize.height / faceScreenSize.height;
    this.setState({ faceAnchor: { x, y } });
  }

  render() {
    let face = '';
    if (this.state.face) {
      face = [<img
        src={this.state.face}
        width={'100%'}
        alt={'face'}
        loading="lazy"
        key='face'
        onLoad={({target:img}) => {
          const height = img.clientHeight;
          const width = img.clientWidth;
          this.setState({ faceScreenSize: { width, height } });
        }}
      />];
      const faceScreenSize = this.state.faceScreenSize;
      if (faceScreenSize != null) {
        face.push(
          <Draggable
            handle=".handle"
            key='anchor'
            defaultPosition={{x: faceScreenSize.width / 2, y: faceScreenSize.height / 2}}
            bounds={{left: 0, top: 0, right: faceScreenSize.width, bottom: faceScreenSize.height}}
            onStop={(e, data) => this.handleDragStop(e, data)}
          >
            <AnchorIcon className='handle' key='anchor' sx={{ position: 'absolute', top: 0, left: 0 }}/>
          </Draggable>
        );
      }
    }
    const selectedImg = this.state.selectedImg != null ? <img
      src={this.state.images[this.state.selectedImg]}
      width={'100%'}
      alt={'selected'}
      loading="lazy"
    /> : '';
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
                  sx={{ marginRight: "1rem" }}
                >
                  Upload Images
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => this.handleImagesUpload(e)} />
                </Button>
              </Box>
              <Box sx={{ position: 'relative', height: '400px', width: '400px' }}>
                {face}
              </Box>
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
                {this.state.images.map((image, index) => (
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
