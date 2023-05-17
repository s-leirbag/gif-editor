var express = require('express');
var router = express.Router();
const multer  = require('multer')
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const cpUpload = upload.fields([
  { name: 'face', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'faceSize', maxCount: 1 },
  { name: 'gifSize', maxCount: 1 },
  { name: 'faceScaleSize', maxCount: 1 },
  { name: 'faceAnchor', maxCount: 1 },
  { name: 'imageAnchor', maxCount: 1 },
])
router.post("/", cpUpload, async (req, res) => {
  const faceBase64 = req.body.face.split(',')[1];
  const imgBase64 = req.body.image.split(',')[1];
  const faceSize = JSON.parse(req.body.faceSize);
  const gifSize = JSON.parse(req.body.gifSize);
  const faceScaleSize = JSON.parse(req.body.faceScaleSize);
  let faceAnchor = objectValuesToIntegers(JSON.parse(req.body.faceAnchor));
  const imgAnchor = objectValuesToIntegers(JSON.parse(req.body.imageAnchor));
  const faceBuffer = Buffer.from(faceBase64, 'base64');
  const imgBuffer = Buffer.from(imgBase64, 'base64');

  // console.log('faceSize ', faceSize);
  // console.log('gifSize ', gifSize);
  // console.log('faceScaleSize ', faceScaleSize);
  // console.log('faceAnchor ', faceAnchor)

  // const ratio = faceScaleSize.width / faceSize.width;
  // faceAnchor = objectValuesToIntegers({x: faceAnchor.x * ratio, y: faceAnchor.y * ratio});
  // console.log('faceAnchor scaled ', faceAnchor)

  // console.log('imgAnchor ', imgAnchor);

  const { data, info } = await sharp(imgBuffer).toBuffer({ resolveWithObject: true });

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const extractLeft = faceAnchor.x > imgAnchor.x ? faceAnchor.x - imgAnchor.x : 0;
  const extractTop = faceAnchor.y > imgAnchor.y ? faceAnchor.y - imgAnchor.y : 0;
  const extractWidth = faceScaleSize.width - extractLeft;
  const extractHeight = faceScaleSize.height - extractTop;
  const extract = {
    left: extractLeft,
    top: extractTop,
    width: extractWidth > gifSize.width ? gifSize.width : extractWidth,
    height: extractHeight > gifSize.height ? gifSize.height : extractHeight,
    background: transparent,
  };
  const extend = {
    left: faceAnchor.x < imgAnchor.x ? imgAnchor.x - faceAnchor.x : 0,
    top: faceAnchor.y < imgAnchor.y ? imgAnchor.y - faceAnchor.y : 0,
    right: faceScaleSize.width - faceAnchor.x < gifSize.width - imgAnchor.x ? (gifSize.width - imgAnchor.x) - (faceScaleSize.width - faceAnchor.x) : 0,
    down: faceScaleSize.height - faceAnchor.y < gifSize.height - imgAnchor.y ? (gifSize.height - imgAnchor.y) - (faceScaleSize.height - faceAnchor.y) : 0,
    background: transparent,
  };
  // console.log('extend ', extend);
  // console.log('extract ', extract);
  // let face = await sharp(faceBuffer)
  //   .resize(faceScaleSize.width, faceScaleSize.height)
  //   .extract(extract)
  //   .extend(extend)
  //   .toBuffer();
  // const metadata = await sharp(face).metadata();
  // console.log(metadata.width, metadata.height);

  // face = await sharp(face).composite([{ input: data }]).toBuffer();

  let face = await translateImg(faceBuffer, faceAnchor.x, faceAnchor.y);

  const base64 = 'data:image/jpeg;base64,' + face.toString('base64');
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

objectValuesToIntegers = (obj) => {
  for (const key in obj)
    obj[key] = parseInt(obj[key]);
  return obj;
}

translateImg = async (img, x, y) => {
  const metadata = await sharp(img).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const extract = {
    left: x < 0 ? -x : 0,
    top: y < 0 ? -y : 0,
    width: width - Math.abs(x),
    height: height - Math.abs(y),
    background: transparent,
  };
  const extend = {
    left: x > 0 ? x : 0,
    top: y > 0 ? y : 0,
    right: x < 0 ? -x : 0,
    down: y < 0 ? -y : 0,
    background: transparent,
  }
  // console.log(width, height, x, y);
  // console.log('extract ', extract);
  // console.log('extend ', extend);
  return await sharp(img).extract(extract).extend(extend).toBuffer();
}

module.exports = router;