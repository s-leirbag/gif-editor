var express = require('express');
var router = express.Router();
const multer  = require('multer')
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const cpUpload = upload.fields([
  { name: 'face', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'faceAnchor', maxCount: 1 },
  { name: 'imageAnchor', maxCount: 1 },
])
router.post("/", cpUpload, async (req, res) => {
  const faceBase64 = req.body.face.split(',')[1];
  const imgBase64 = req.body.image.split(',')[1];
  const faceAnchor = req.body.faceAnchor;
  const imgAnchor = req.body.imageAnchor;
  const faceBuffer = Buffer.from(faceBase64, 'base64');
  const imgBuffer = Buffer.from(imgBase64, 'base64');
  // const newImage = await sharp(faceBuffer).greyscale().toBuffer();
  const image = sharp(imgBuffer);
  const metadata = await image.metadata();

  const { data, info } = await sharp(imgBuffer).toBuffer({ resolveWithObject: true });
  const newImage = await sharp(faceBuffer)
    .resize(metadata.width, metadata.height, {fit: sharp.fit.contain})
    // .extract({ left: left, top: top, width: width, height: height })
    // .resize(metadata.width, metadata.height)
    .composite([{ input: data }])
    .toBuffer();
  const base64 = 'data:image/jpeg;base64,' + newImage.toString('base64');
  res.send(base64);
});

// router.post("/", upload.array("images", 50), async (req, res) => {
//   let images = []
//   for (const file of req.files) {
//     const buffer = file.buffer;
//     const newImage = await sharp(buffer).greyscale().toBuffer();
//     const base64 = 'data:image/png;base64,' + newImage.toString('base64');
//     const base64noHeader = base64.split(',')[1];
//     const buffer2 = Buffer.from(base64noHeader, 'base64');
//     const newImage2 = await sharp(buffer2).rotate(90).toBuffer();
//     const base642 = 'data:image/png;base64,' + newImage2.toString('base64');
//     images.push(base642);
//   }
//   res.send(images)
// });

module.exports = router;