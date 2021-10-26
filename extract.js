const fs = require('fs');

const classNameRegex = /^class (?<className>[A-Za-z_]+):/;
const funcNameRegex = /^def (?<functionName>[A-Za-z_]+)/;
const methodNameRegex = /\s+def (?<methodName>[A-Za-z_]+)/;
const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.]*[A-Za-z_]+)\(/;

function collectImports(lines) {
  let file_imports = {'importOrigin': {}, 'simpleImports': [], 'aliases': {}}
  const fromImport = /from (?<origin>.*) import (?<import>.*)/
  const aliasImport = /import (?<import>.*) as (?<alias>.*)/
  const simpleImport = /^import (?<import>.[a-z0-9_.-]+)/

  let found = null;
  for (let line of lines) {
    found = line.match(fromImport);
    if (found != null) {
      let imports = found.groups.import.split(', ');
      for (let im of imports) {
        file_imports['importOrigin'][im] = found.groups.origin;
      }
    }

    found = line.match(simpleImport);
    if (found != null) {
      let imports = found.groups.import.split(', ');
      for (let im of imports) {
        file_imports['simpleImports'].push(im);
      }
    }

    found = line.match(aliasImport);
    if (found != null) {
      file_imports['aliases'][found.groups.import] = found.groups.alias;
    }
  }

  return file_imports;
}

function run() {
  try {
      let data = fs.readFileSync('data.py', 'utf8');
      let lines = data.toString().split('\r\n');

      let file_imports = collectImports(lines);
      console.log(file_imports);

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
      
      // Replace self with class name
      const regEx = /(.)+\./
      for (let func in nodes) {
        let calledFuncs = nodes[func];
        let funcClass = func.match(regEx);
        if (funcClass != null) {
          for (const calledFunc of calledFuncs) {
            nodes[func] = calledFunc.replace('self.', funcClass[0])
          } 
        }
      }

      // Replace imports with aliases
      // for (let func in nodes) {
      //   let calledFuncs = nodes[func];
      //   let funcClass = func.match(regEx);
      //   if (funcClass != null) {
      //     for (const calledFunc of calledFuncs) {
      //       nodes[func] = calledFunc.replace('self.', funcClass[0])
      //     } 
      //   }
      // }

      console.log(nodes);
  } catch(e) {
      console.log('Error:', e.stack);
  }
}

run()