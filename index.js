const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const path = require("path");
const pdf = require('pdf-parse');
const fs = require('fs');
require('dotenv').config();
const axios = require('axios');
var FormData = require('form-data');



let SummarizerManager = require("node-summarizer").SummarizerManager;
const Filter = require('node-image-filter');
// var summarizer = require('nodejs-text-summarizer')
const summarizer = require('node-summarizer')

// import TextSummarizer from 'text-summarizer-ai';


const app = express();
app.use(express.static(__dirname + '/uploads'));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});


const upload = multer({ storage: storage });

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});




//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
app.post("/upload", upload.single("file"), async (req, res) => {
  const imagePath = req.file.path
  // const name = req.file.path+"."+req.file.originalname.split(".")[1];
  console.log(imagePath);
  try {
    const result = await Tesseract.recognize(imagePath, "eng", { logger: console.log });
   
    
    const wordCount = result.data.text.split(' ').length;
    const averageRowCount = 30;
    const rows = Math.round((wordCount / averageRowCount) /3);
    

    let Summarizerv = new SummarizerManager(result.data.text,rows);
    let summary = Summarizerv.getSummaryByFrequency().summary;

    // const formdata = new FormData();
    // formdata.append("key", "ff58d8193d330227bc1cc31ca0f01be6");
    // formdata.append("txt", result.data.text);
    // formdata.append("sentences", rows);

    // const requestOptions = {
    //   method: 'POST',
    //   body: formdata,
    //   redirect: 'follow'
    // };

    // const response = await axios.post("https://api.meaningcloud.com/summarization-1.0", formdata);
    // console.log(response.data);
    

    //let fin = "Summary: "+summary+" <br/> <br/>: Summary 2 "+response.data.summary +"<br/><br/>Text: "+result.data.text;
    const summary2  = "This is the second summary"
    const image =  imagePath.split("\\")[1];
    const text = result.data.text;
    console.log(image)
  //res.send(fin);
  res.render('upload', { summary ,summary2,text,image});
  } catch (error) {
    console.log(error);
    res.status(500).send("Error processing image.");
  }
});

app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
    const pdfPath = req.file.path;
    const dataBuffer = fs.readFileSync(pdfPath);
  
    pdf(dataBuffer).then(function(data) {
      const extractedText = data.text;
      let Summarizer = new SummarizerManager( extractedText,3);
      let summary = Summarizer.getSummaryByFrequency().summary;
      res.send(`<pre>${summary}</pre>`);
    });
  });

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
