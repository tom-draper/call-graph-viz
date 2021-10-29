const extract = require("./public/extract.js");
const express = require("express");


function getFilePath() {
  let file = process.argv[2]

  // Check for no input
  if (file == undefined) {
    console.log("Using default main.py\nRun \"node main [filename].py\" to specify a file within the code directory")
    file = 'main.py'
  }
  
  // Add .py if missing
  if (file.substring(file.length-3, file.length) != '.py') {
    file += '.py'
  }
  
  let path = "./code/" + file
  return path
}

function handleArgs () {
  return getFilePath()
}


let path = handleArgs()
let includeImports = false;
let includeStdLib = true;

extract.run(path, includeImports, includeStdLib); 

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.render("index.html");
});

app.listen(port);
console.log("Server started at: http://localhost:" + port);
