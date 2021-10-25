var fs = require('fs');

try {  
    let data = fs.readFileSync('test_code.py', 'utf8');
    let lines = data.toString().split('\r\n');

    console.log(lines);

    let nodes = {}

    const classNameRegex = /^class (?<className>[A-Za-z_]+):/;
    const funcNameRegex = /^def (?<functionName>[A-Za-z_]+)/;
    const methodNameRegex = /\s+def (?<methodName>[A-Za-z_]+)/;
    const calledFuncRegex = /(?<calledFunction>[A-Za-z_]+)\(/;
    
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
        }

        // Look for a called function
        let found = line.match(calledFuncRegex);
        if (found != null) {
          if (currentClass == null) {
            nodes[currentFunction].push(found.groups.calledFunction);
          } else {
            nodes[currentClass + '.' + currentFunction].push(found.groups.calledFunction);
          }
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