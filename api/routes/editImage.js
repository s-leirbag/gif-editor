var express = require('express');
var router = express.Router();
const multer  = require('multer')
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// Upload fields
const cpUpload = upload.fields([
  { name: 'face', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'faceSize', maxCount: 1 },
  { name: 'gifSize', maxCount: 1 },
  { name: 'faceScaleSize', maxCount: 1 },
  { name: 'faceCenter', maxCount: 1 },
  { name: 'facePos', maxCount: 1 },
  { name: 'faceRot', maxCount: 1 },
  { name: 'faceLayer', maxCount: 1 },
])

// POST /api/editImage
router.post("/", cpUpload, async (req, res) => {
  // Parse data from request
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
  const faceLayer = JSON.parse(req.body.faceLayer);
  let face = Buffer.from(faceBase64, 'base64');
  const gifImg = Buffer.from(imgBase64, 'base64');

  if (faceScaleSize.width === 0 || faceScaleSize.height === 0) {
    // Return image with no face if face scaled down to 0
    res.send(req.body.image);
    return;
  }

  // Scale original face image to scaled size using nearest neighbor
  face = await resize(face, faceScaleSize.width, faceScaleSize.height, sharp.kernel.nearest);

  // Rotate
  face = await rotate(face, faceRot);

  // Move to face position
  let c2fc = subtractVectors(faceCenter, center); // center to face center
  rotatedc2fc = rotateVector(c2fc, faceRot); // rotated center to face center
  const rotCenter = getCenter(await getSize(face));
  const rotatedFC = addVectors(rotCenter, rotatedc2fc); // find face center based on rotated center
  // move from new rotated face center to the face position/where the center should be
  face = await translate(face,
    parseInt(facePos.x - rotatedFC.x),
    parseInt(facePos.y - rotatedFC.y),
  );

  // Merge face and image
  face = await resizeCanvas(face, gifSize.width, gifSize.height);
  if (faceLayer === 'back')
    face = await sharp(face).composite([{ input: gifImg }]).toBuffer();
  else
    face = await sharp(gifImg).composite([{ input: face }]).toBuffer();
  
  res.send(bufferToBase64(face));
});

/**
 * Math helper functions
 */

// Parse all values in an object to integers
objValsToInts = (obj) => {
  for (const key in obj)
    obj[key] = parseInt(obj[key]);
  return obj;
}

getCenter = ({ width, height }) => {
  return { x: width / 2, y: height / 2 };
}

addVectors = (vec1, vec2) => {
  return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
}

subtractVectors = (vec1, vec2) => {
  return { x: vec1.x - vec2.x, y: vec1.y - vec2.y };
}

rotateVector = (vec, ang) => {
  ang = ang * (Math.PI/180);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  return {
    x: Math.round(10000*(vec.x * cos - vec.y * sin))/10000,
    y: Math.round(10000*(vec.x * sin + vec.y * cos))/10000,
  };
};

/**
 * Sharp/Image helper functions
 * To make code more readable
 */

transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// Add base64 header to buffer
bufferToBase64 = (buffer) => 'data:image/png;base64,' + buffer.toString('base64');

// Make blank RBGA png
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

// Get image size
getSize = async (img) => {
  const metadata = await sharp(img).metadata();
  const width = metadata.width;
  const height = metadata.height;
  return { width, height };
}

// Resize image using a certain sample method
resize = async (img, width, height, sampleMethod) => {
  return await sharp(img).resize(width, height, {
    kernel: sampleMethod,
  }).toBuffer();
}

rotate = async (img, deg) => {
  return await sharp(img).rotate(deg, { background: transparent }).toBuffer();
}

/**
 * Translate image on canvas
 * Keep the same canvas size using cropping/extending
 * Can translate off of the canvas to have a blank result
 */
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

// Resize canvas to a certain size
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
