var express = require('express');
var router = express.Router();
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const GifEncoder = require('gif-encoder');
const sharp = require('sharp');
const fs = require('fs');

const cpUpload = upload.fields([
  { name: 'images', maxCount: 100 },
  { name: 'gifSize', maxCount: 1 },
])
router.post("/", cpUpload, async (req, res) => {
  const images = JSON.parse(req.body.images);
  const gifSize = JSON.parse(req.body.gifSize);

  let gif = new GifEncoder(gifSize.width, gifSize.height);

  // Collect output into file
  var file = fs.createWriteStream('gif.gif');
  gif.pipe(file);

  gif.writeHeader();
  gif.setRepeat(0);
  gif.setQuality(1);
  // gif-encoder takes in a color to turn transparent in the image for a transparent background
  // I picked a color hopefully not in the image
  gif.setTransparent(0x1a0902);
  
  // Add each frame to the gif
  for (const image of images) {
    const imgBase64 = image.split(',')[1];
    const img = Buffer.from(imgBase64, 'base64');

    gif.addFrame(
      [
        // make a background image of the transparent color
        ...await sharp({
          create: {
            width: gifSize.width,
            height: gifSize.height,
            channels: 4,
            //RGB 26, 9, 2 aka 0x1a0902
            background: { r: 26, g: 9, b: 2, alpha: 1 }
          }
        // layer the background layer behind the image
        // and extract raw pixels for gif encoder to use
        }).composite([{ input: img }]).raw().toBuffer()
      ]
    );
  }
  gif.finish();
  
  // read the output file and send it as a URI
  fs.readFile('gif.gif', (err, data) => {
    if (err) throw err;
    const base64 = gifBufferToBase64(data);
    res.send(base64);
  });
});

gifBufferToBase64 = (buffer) => 'data:image/gif;base64,' + buffer.toString('base64');

module.exports = router;
