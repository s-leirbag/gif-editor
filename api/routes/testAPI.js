var express = require('express');
var router = express.Router();
const multer  = require('multer')
const Jimp = require('jimp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://gif-editor.vercel.app/"); // update to match the domain you will make the request from
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  next();
});

router.post("/", upload.array("images", 5), async (req, res) => {
  let images = []
  for (const file of req.files) {
    const buffer = file.buffer;
    const image = await Jimp.read(buffer);
    base64Image = await image.invert().getBase64Async(Jimp.AUTO)
    images.push(base64Image)
  }
  res.send(images)
});

module.exports = router;