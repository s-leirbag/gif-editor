var express = require('express');
var router = express.Router();
const multer  = require('multer')
const Jimp = require('jimp');
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.post("/", upload.array("images", 50), async (req, res) => {
  let images = []
  for (const file of req.files) {
    const buffer = file.buffer;

    const a = await sharp(buffer).greyscale().toBuffer();
    const base64Image = 'data:image/png;base64,' + a.toString("base64");
    
    // const image = await Jimp.read(buffer);
    // const base64Image = await image.greyscale().getBase64Async(Jimp.AUTO);

    // console.log(base64Image);
    images.push(base64Image);
  }
  res.send(images)
});

module.exports = router;