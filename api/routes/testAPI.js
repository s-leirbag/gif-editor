var express = require('express');
var router = express.Router();
const multer  = require('multer')
const Jimp = require('jimp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

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