const fs = require('fs');


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


function runFile(filename) {
  let file = filename.replace('.py', '')

  const classNameRegex = /^class (?<className>[A-Za-z_]+)?(\(.*\)):/;
  const funcNameRegex = /^def (?<functionName>[A-Za-z_]+)/;
  const methodNameRegex = /\s+def (?<methodName>[A-Za-z_]+)/;
  const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.\'\'\[\]]*[A-Za-z_]+)\(/;

  try {
    let data = fs.readFileSync(filename, 'utf8');
    let lines = data.toString().split('\r\n');

    let file_imports = collectImports(lines);
    console.log(file_imports);

    let nodes = {'global': []}
    
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
          
          let functionID = null
          if (currentClass != null) {
            functionID = file + '.' + currentClass + '.' + currentFunction
          } else {
            functionID = file + '.' + currentFunction
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

        // Look for global called function
        // found = line.match(calledFuncRegex);
        // if (found != null) {
        //   let calledFunction = found.groups.calledFunction + '()'
        //   let functionID = 'global'
        //   nodes[functionID].push(calledFunction);
        //   continue
        // }

        // Look for a method definition
        if (withinClass) {
          let found = line.match(methodNameRegex);
          if (found != null) {
            currentFunction = found.groups.methodName;
            if (!(file + '.' + currentClass + '.' + currentFunction in nodes)) {
              nodes[file + '.' + currentClass + '.' + currentFunction] = []
            }
            withinFunction = true;
          }
        }
        // Even if withinClass, we need to continue and check for a function 
        // definition to check whether we have exited the current class 

        // Look for a function definition
        found = line.match(funcNameRegex);
        if (found != null) {
          currentFunction = found.groups.functionName;
          if (!(currentFunction in nodes)) {
            nodes[currentFunction] = []
          }
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
      let funcClass = func.match(regEx);
      if (funcClass != null) {
        for (const calledFunc of nodes[func]) {
          nodes[func] = calledFunc.replace('self.', funcClass[0])
        } 
      }
    }

    // Replace imports with aliases
    if (file_imports != null) {
      for (let func in nodes) {
        for (let original in file_imports.aliases) {
          let alias = file_imports.aliases[original]
          if (nodes[func].length > 0) {
            nodes[func] = nodes[func].replace(alias, original)
          }
        }
      }
    }

    console.log(nodes);
} catch (e) {
    console.log('Error:', e.stack);
}
}

function run() {
  runFile('data.py');
}

run()