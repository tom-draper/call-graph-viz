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

function lineIndent(line, indentSize) {
  let spaces = line.match(/^([\s]+)/);
  if (spaces != null) {
    indent = spaces[0].length / indentSize;
  } else {
    indent = 0;
  }
  return indent;
}

function adjustIndentation(indent, currentIndent, stack) {
  if (indent < currentIndent) {
    let diff = currentIndent - indent;
    for (let i = 0; i < diff; i++) {
      stack.pop();
      currentIndent -= 1;
    }
    currentIndent += 1;
  } else if (indent+1 == currentIndent) {
    stack.pop();
  } else {
    currentIndent += 1
  }
  return currentIndent;
}

function test(nodes) {
  data_py_test = {
    'data.global': 1,
    'data.global.DF.__init__': 1,
    'data.global.DF.__str__': 1,
    'data.global.DF.save_to_html': 3,
    'data.global.Fixtures.__init__': 1,

  }

  let correct = 0
  let total = 0
  for (let key in data_py_test) {
    if (nodes[key].length == data_py_test[key]) {
      correct += 1;
    }
    total += 1;
  }
  let accuracy = correct / total;
  console.log('Accuracy:', accuracy*100, '%');
}

function runFile(filename) {
  let file = filename.replace('.py', '')

  const classNameRegex = /class (?<className>[A-Za-z_]+)(\(.*\))?:/;
  const funcNameRegex = /def (?<functionName>[A-Za-z_]+)/;
  // const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.\'\[\]]*[A-Za-z_]+)\(/;
  const calledFuncRegex = /(?<calledFunction>([a-zA-Z]+\([^\)]*\)(\.[^\)]*\))?))/;


  try {
    let data = fs.readFileSync(filename, 'utf8');
    let lines = data.toString().split('\r\n');

    let fileImports = collectImports(lines);
    console.log(fileImports);

    let nodes = {}

    let stack = [{'type': 'global', 'name': 'global'}]
    let indentSize = 4  // Spaces
    let currentIndent = 0;
    let found = null;
    for (let index in lines) {
      let line = lines[index];

      // Look for class definition
      found = line.match(classNameRegex);
      if (found != null) {
        let indent = lineIndent(line, indentSize);

        currentIndent = adjustIndentation(indent, currentIndent, stack);

        stack.push({
          'type': 'class',
          'name': found.groups.className
        })
        continue;
      }

      // Look for function definition
      found = line.match(funcNameRegex);
      if (found != null) {
        let indent = lineIndent(line, indentSize);

        currentIndent = adjustIndentation(indent, currentIndent, stack);

        stack.push({
          'type': 'function',
          'name': found.groups.functionName
        })
        continue;
      }

      // Look for a called function
      found = [...line.matchAll(calledFuncRegex)];
      if (found.length > 0) {
        for (let i = 0; i < found.length; i++) {
          let func = '';
          for (let s of stack) {
            func += '.' + s.name;
          }
          func = file + func;
          if (!(func in nodes)) {
            nodes[func] = []
          }
          nodes[func].push(found[i].groups.calledFunction)
        }
      }
    }
    console.log(nodes)

    test(nodes);

} catch (e) {
    console.log('Error:', e.stack);
}
}

function run() {
  runFile('data.py');
}

run()