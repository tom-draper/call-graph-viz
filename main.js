const extract = require("./public/extract.js");
const express = require("express");

function getFilePath() {
  let file = process.argv[2];

  // Check for no input
  if (file == undefined) {
    console.log(
      'Using default main.py\nRun "node main [filename].py" to specify a file within the code directory'
    );
    file = "main.py";
  }

  // Add .py if missing
  if (file.substring(file.length - 3, file.length) != ".py") {
    file += ".py";
  }

  let path = "./code/" + file;
  return path;
}

function flagVal(flagValStr) {
  let flagVal = null;
  if (["true", "True", "t", "T"].includes(flagValStr)) {
    flagVal = true;
  } else if (["false", "False", "f", "F"].includes(flagValStr)) {
    flagVal = false;
  }
  return flagVal;
}

function handleArgs() {
  let flags = process.argv.splice(3);

  // Defaults
  let includeImports = false;
  let includeStdLib = true;

  for (let i = 0; i < flags.length; i++) {
    let flag = flags[i];
    if (flag === "-imports" || flag === "-import") {
      if (i != flags.length - 1) {
        let val = flagVal(flags[i + 1]);
        if (val == null) {
          continue;
        }
        includeImports = val;
      }
    } else if (
      flag === "-stdlib" ||
      flag === "-standardlib" ||
      flag === "-standardlibrary"
    ) {
      if (i != flags.length - 1) {
        let val = flagVal(flags[i + 1]);
        if (val == null) {
          continue;
        }
        includeStdLib = val;
      }
    }
  }

  let path = getFilePath();

  return [path, includeImports, includeStdLib];
}

let [path, includeImports, includeStdLib] = handleArgs();

extract.run(path, includeImports, includeStdLib);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.render("index.html");
});

app.listen(port);
console.log("Server started at: http://localhost:" + port);
