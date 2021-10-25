const fs = require('fs');

const classNameRegex = /^class (?<className>[A-Za-z_]+):/;
const funcNameRegex = /^def (?<functionName>[A-Za-z_]+)/;
const methodNameRegex = /\s+def (?<methodName>[A-Za-z_]+)/;
const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.]*[A-Za-z_]+)\(/;

function run() {
  try {  
      let data = fs.readFileSync('test_code.py', 'utf8');
      let lines = data.toString().split('\r\n');

      console.log(lines);

      let nodes = {}
      
      let withinClass = false;
      let currentClass = null;
      let withinFunction = false;
      let currentFunction = null;
      for (let index in lines) {
        let line = lines[index];

        if (withinFunction) {
          // If function has finished
          if (line == '') {
            withinFunction = false;
            currentFunction = null;
            continue
          }

          // Look for a called function
          let found = line.match(calledFuncRegex);
          if (found != null) {
            let calledFunction = found.groups.calledFunction + '()'
            
            let functionID = currentFunction
            if (currentClass != null) {
              functionID = currentClass + '.' + currentFunction
            }

            nodes[functionID].push(calledFunction);
          }
        } else {
          // Look for class definition
          let found = line.match(classNameRegex);
          if (found != null) {
            currentClass = found.groups.className;
            withinClass = true;
            continue;
          }

          // Look for a method definition
          if (withinClass) {
            let found = line.match(methodNameRegex);
            if (found != null) {
              currentFunction = found.groups.methodName;
              nodes[currentClass + '.' + currentFunction] = []
              withinFunction = true;
            }
          }
          // Even if withinClass, we need to continue and check for a function 
          // definition to check whether we have exited the current class 

          // Look for a function definition
          found = line.match(funcNameRegex);
          if (found != null) {
            currentFunction = found.groups.functionName;
            nodes[currentFunction] = []
            withinFunction = true;
            // If we've found a non-indented function definition 
            // and we were within within a class -> no longer within that class
            if (withinClass) {
              currentClass = null;
              withinClass = false;
            }
          }
        }
      }

      console.log(nodes);
  } catch(e) {
      console.log('Error:', e.stack);
  }
}

run()