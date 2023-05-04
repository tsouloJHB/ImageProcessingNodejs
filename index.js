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
  res.render('index.ejs',{error:""});
});




//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
app.post("/upload", upload.single("file"), async (req, res) => {
  const imagePath = req.file.path
  let apiImageProcessingResults = ""
  let tesseractImageProcessingResults = "";
  try {
    //process image
    if(req.body.version == "v1"){
      //result
      tesseractImageProcessingResults = await tesseractImageProcessing(imagePath);
      if( tesseractImageProcessingResults == ""){
        res.status(500).render('index', { error: 'Error processing image. try version 2' });
        return;
      }
      
    }else if(req.body.version == "v2"){
      apiImageProcessingResults  = await apiImageProcessing(imagePath);
      if( apiImageProcessingResults== "" ||  apiImageProcessingResults == undefined){
        res.status(500).render('index', { error: 'Error processing image. try version 1' });
        
        return;
      }
    }else{
      res.status(500).send("No version specified");
      return;
    }

    const text = apiImageProcessingResults != "" ? apiImageProcessingResults : tesseractImageProcessingResults.data.text;

    // create summary 
    
    const rows= await summaryRows(text); 
    const summary2  = await  summarizerSummaryProcessing(text,rows);
    const image =  imagePath.split("\\")[1];
    const summary = await apiSummaryProcessing(text,rows);

    res.render('upload', { summary ,summary2,text,image});
      

  } catch (error) {
    console.log(error);
     res.render('upload', { summary, summary2, text, image });
     res.status(500).render('index', { error: 'Error processing image' });

  }
});

const mergeTexts =  async (jsonObj) => {
  let mergedText = '';

  for (const item of jsonObj) {
    mergedText += item.text + ' ';
  }

  return mergedText.trim();
}
const apiImageProcessing = async (imagePath) =>{
  try {
    const imageData = new FormData();
    imageData.append('image', fs.createReadStream(imagePath));

    const response = await axios.post('https://api.api-ninjas.com/v1/imagetotext', imageData, {
      headers: {
        ...imageData.getHeaders(),
        'X-Api-Key': 'skqX0n69cDV5Tpfx2n6xHQ==8WBkO2y0KCX0Bdbt'
      }
    });
    const summaryJson = await mergeTexts(response.data)
    return summaryJson
  } catch (error) {
    return "";
  }

}

const tesseractImageProcessing = async (imagePath) =>{
  try {
    const response = Tesseract.recognize(imagePath, "eng", { logger: console.log });
    return response;
  } catch (error) {
    return "";
  }
}

const apiSummaryProcessing = async (text,rows) =>{
    try {
      //https://www.meaningcloud.com/developer/    credits 20000
      const formdata = new FormData();
      formdata.append("key", "ff58d8193d330227bc1cc31ca0f01be6");
      formdata.append("txt", text);
      formdata.append("sentences", rows);

      const response = await axios.post("https://api.meaningcloud.com/summarization-1.0", formdata);
      return response.data.summary

    } catch (error) {
      return false
    }
}

const summarizerSummaryProcessing = async (text,rows) =>{
  
   try {
     let Summarizer = new SummarizerManager(text,rows);
     let summary = Summarizer.getSummaryByFrequency().summary;
     return summary
   } catch (error) {
    return ""
   }

}


const summaryRows = (text) =>{
    const wordCount = text.split(' ').length;
    const averageRowCount = 30;
    const rows = Math.round((wordCount / averageRowCount) /3);

    return rows
}

app.post('/upload-pdf', upload.single('pdf'), async(req, res) => {
    const pdfPath = req.file.path;
    const dataBuffer = fs.readFileSync(pdfPath);

    const data = await pdf(dataBuffer);
    const text = data.text;
    const rows= summaryRows(text); 
    const summary = await apiSummaryProcessing(text,rows);
    const summary2  = await summarizerSummaryProcessing(text,rows);
    const image = "";  
    res.render('upload', { summary, summary2, text, image });
  });

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
