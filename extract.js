var fs = require('fs');

try {  
    let data = fs.readFileSync('test_code.py', 'utf8');
    let lines = data.toString().split('\r\n');

    let nodes = {}

    const calledFuncRegex = /(?<calledFunction>[A-Za-z_]*)\(/;
    const funcNameRegex = /def (?<functionName>[A-Za-z_]*)/;

    let withinFunction = false;
    let currentFunction = null;
    for (let index in lines) {
      let line = lines[index];

      if (withinFunction) {
        // If function has finished
        if (line == '') {
          withinFunction = false;
          currentFunction = null;
        }

        // Look for a called function
        let found = line.match(calledFuncRegex);
        if (found != null) {
          console.log(found.groups.calledFunction);
          nodes[currentFunction].push(found.groups.calledFunction);
        }

      } else {
        // Look for a function definition
        let found = line.match(funcNameRegex);
        if (found != null) {
          console.log(found.groups.functionName);
          currentFunction = found.groups.functionName;
          nodes[currentFunction] = []
          withinFunction = true;
        }
      }
    }

    console.log(nodes);
} catch(e) {
    console.log('Error:', e.stack);
}