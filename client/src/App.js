import React from 'react';
import './App.css';

import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Paper from '@mui/material/Paper';
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { clone, cloneDeep, sample, isEmpty } from 'lodash';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      face: '',
      images: [],
      filename: '',
    };
  }

  async handleFaceUpload(e) {
    e.preventDefault();
    if (!e.target.files)
      return;
    
    const file = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    let self = this;
    fileReader.addEventListener("load", function () {
      self.setState({ face: this.result })
    });
  }

  async handleImagesUpload(e) {
    e.preventDefault();
    const files = e.target.files;
    if (!files)
      return;

    // function readFile(file) {
    //   return new Promise(function (resolve, reject) {
    //     let fr = new FileReader();
    //     fr.onload = function(){ resolve(fr.result) };
    //     fr.onerror = function(){ reject(fr) };
    //     fr.readAsDataURL(file);
    //   });
    // }

    // let readers = [];
    // // Store promises in array
    // for(const file of files){
    //   readers.push(readFile(file));
    // }
    
    // // Trigger Promises
    // Promise.all(readers).then((urls) => {
    //   let newImages = cloneDeep(this.state.images);
    //   for (const url of urls)
    //     newImages.push(url);
    //   this.setState({ images: newImages })
    // });
    
    let data = new FormData()
    for (const file of e.target.files)
      data.append('images', file)

    const response = await fetch('https://gif-editor-api.vercel.app/testAPI', {
      method: "POST",
      body: data,
    });
    if (!response.ok)
      return;

    let newImages = cloneDeep(this.state.images);
    const images = await response.json();
    for (const image of images)
      newImages.push(image);
    this.setState({ images: newImages })
  }

  render() {
    const face = this.state.face ? <img
      src={this.state.face}
      // width={'100%'}
      alt={'face'}
      loading="lazy"
    /> : '';
    return (
      <div className="App">
        <CssBaseline />
        <Paper sx={{ m: 2, p: 2 }}>
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
          {face}
          <ImageList sx={{ height: '100%' }} cols={3} >
            {this.state.images.map((image, index) => (
              <ImageListItem key={index}>
                <img
                  src={image}
                  width={'100%'}
                  alt={'image ' + index}
                  loading="lazy"
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Paper>
      </div>
    );
  }
}
