var express = require('express');
var router = express.Router();
const multer  = require('multer')
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.post("/", upload.array("images", 50), async (req, res) => {
  let images = []
  for (const file of req.files) {
    const buffer = file.buffer;
    const newImage = await sharp(buffer).greyscale().toBuffer();
    const base64 = 'data:image/png;base64,' + newImage.toString("base64");
    images.push(base64);
  }
  res.send(images)
});

module.exports = router;