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
  { name: 'faceCenter', maxCount: 1 },
  { name: 'facePos', maxCount: 1 },
  { name: 'faceRot', maxCount: 1 },
])
router.post("/", cpUpload, async (req, res) => {
  const faceBase64 = req.body.face.split(',')[1];
  const imgBase64 = req.body.image.split(',')[1];
  const faceSize = JSON.parse(req.body.faceSize);
  const gifSize = JSON.parse(req.body.gifSize);
  const faceScaleSize = objValsToInts(JSON.parse(req.body.faceScaleSize));
  const center = objValsToInts(getCenter(faceScaleSize));
  const ratio = faceScaleSize.width / faceSize.width;
  let faceCenter = JSON.parse(req.body.faceCenter);
  faceCenter = objValsToInts({x: faceCenter.x * ratio, y: faceCenter.y * ratio});
  const facePos = objValsToInts(JSON.parse(req.body.facePos));
  const faceRot = objValsToInts(JSON.parse(req.body.faceRot));
  let face = Buffer.from(faceBase64, 'base64');
  const gifImg = Buffer.from(imgBase64, 'base64');

  if (faceScaleSize.width === 0 || faceScaleSize.height === 0) {
    res.send(req.body.image);
    return;
  }

  face = await resize(face, faceScaleSize.width, faceScaleSize.height, sharp.kernel.nearest);

  // Center and rotate
  face = await translate(face, center.x - faceCenter.x, center.y - faceCenter.y);
  face = await rotate(face, faceRot);

  // Move to face position
  const rotCenter = getCenter(await getSize(face));
  face = await translate(face,
    parseInt(facePos.x - rotCenter.x),
    parseInt(facePos.y - rotCenter.y)
  );

  // Merge images
  face = await resizeCanvas(face, gifSize.width, gifSize.height);
  face = await sharp(face).composite([{ input: gifImg }]).toBuffer();
  
  res.send(bufferToBase64(face));
});

objValsToInts = (obj) => {
  for (const key in obj)
    obj[key] = parseInt(obj[key]);
  return obj;
}

getCenter = ({ width, height }) => {
  return { x: width / 2, y: height / 2 };
}

transparent = { r: 0, g: 0, b: 0, alpha: 0 };

bufferToBase64 = (buffer) => 'data:image/png;base64,' + buffer.toString('base64');

createPng = async (width, height) => {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: transparent,
    }
  }).png().toBuffer();
}

getSize = async (img) => {
  const metadata = await sharp(img).metadata();
  const width = metadata.width;
  const height = metadata.height;
  return { width, height };
}

resize = async (img, width, height, sampleMethod) => {
  return await sharp(img).resize(width, height, {
    kernel: sampleMethod,
  }).toBuffer();
}

rotate = async (img, deg) => {
  return await sharp(img).rotate(deg, { background: transparent }).toBuffer();
}

translate = async (img, x, y) => {
  const { width, height } = await getSize(img);
  const extract = {
    left: x < 0 ? -x : 0,
    top: y < 0 ? -y : 0,
    width: x < 0 ? width + x : width,
    height: y < 0 ? height + y : height,
    background: transparent,
  };
  const extend = {
    left: x > 0 ? x : 0,
    top: y > 0 ? y : 0,
    right: x < 0 ? -x : 0,
    bottom: y < 0 ? -y : 0,
    background: transparent,
  }
  if (extract.width <= 0 || extract.height <= 0)
    return createPng(width, height);
  return await sharp(img).extract(extract).extend(extend).toBuffer();
}

resizeCanvas = async (img, newWidth, newHeight) => {
  const metadata = await sharp(img).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const widthLarger = newWidth > width;
  const heightLarger = newHeight > height;
  const extract = {
    left: 0,
    top: 0,
    width: widthLarger ? width : newWidth,
    height: heightLarger ? height : newHeight,
    background: transparent,
  }
  const extend = {
    right: widthLarger ? newWidth - width : 0,
    bottom: heightLarger ? newHeight - height : 0,
    background: transparent,
  }
  return await sharp(img).extract(extract).extend(extend).toBuffer();
}

module.exports = router;
