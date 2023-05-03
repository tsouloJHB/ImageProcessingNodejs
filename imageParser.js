const T = require("tesseract.js");


const imageToTextParser = async(image) => {
    T.recognize("uploads/"+image,'eng',{logger:e =>console.log(e)}).
    then((out) => {return out.data.text;}
   // console.log(out.data.text)
    );
}
module.exports = imageToTextParser;