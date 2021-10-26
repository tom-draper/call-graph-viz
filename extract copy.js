const fs = require('fs');

const classNameRegex = /\r\nclass (?<name>[A-Za-z_]+):(?<code>(\r\n.*)*)(\r\n[^\s^\t])/g;
const classNameRegex2 = /\r\nclass (?<name>[A-Za-z_]+):(?<code>(\r\n.*)*)$(?![\r\n])/g;
// const classNameRegex = /class (?<name>[A-Za-z_]+):\r\n/g;


const funcNameRegex = /^def (?<functionName>[A-Za-z_]+)/;
const methodNameRegex = /\s+def (?<methodName>[A-Za-z_]+)/;
const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.]*[A-Za-z_]+)\(/;

function run() {
  try {  
      // console.log(lines.slice(500));
      let data = fs.readFileSync('test_code.py', 'utf8').toString();
      let nodes = {};

      let foundClasses = [...data.matchAll(classNameRegex)];
      if (foundClasses.length > 0) {
        for (let i = 0; i<foundClasses.length; i++) {
          console.log(foundClasses[i][1]);  // Name
          console.log(foundClasses[i][2]);  // Code
        }
      }
      console.log(foundClasses.length)

      foundClasses = [...data.matchAll(classNameRegex2)];
      if (foundClasses.length > 0) {
        for (let i = 0; i<foundClasses.length; i++) {
          console.log(foundClasses[i][1]);  // Name
          console.log(foundClasses[i][2]);  // Code
        }
      }
      console.log(foundClasses.length)

      console.log(nodes);
  } catch(e) {
      console.log('Error:', e.stack);
  }
}

run()