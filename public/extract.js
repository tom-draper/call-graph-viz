const fs = require("fs");

function collectImports(lines) {
  let file_imports = { importOrigin: {}, simpleImports: [], aliases: {} };
  const fromImport = /from (?<origin>.*) import (?<import>.*)/;
  const aliasImport = /import (?<import>.*) as (?<alias>.*)/;
  const simpleImport = /^import (?<import>.[a-z0-9_.-]+)/;

  let found = null;
  for (let line of lines) {
    found = line.match(fromImport);
    if (found != null) {
      let imports = found.groups.import.split(", ");
      for (let im of imports) {
        file_imports["importOrigin"][im] = found.groups.origin;
      }
    }

    found = line.match(simpleImport);
    if (found != null) {
      let imports = found.groups.import.split(", ");
      for (let im of imports) {
        file_imports["simpleImports"].push(im);
      }
    }

    found = line.match(aliasImport);
    if (found != null) {
      file_imports["aliases"][found.groups.import] = found.groups.alias;
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
  } else if (indent + 1 == currentIndent) {
    stack.pop();
  } else {
    currentIndent += 1;
  }
  return currentIndent;
}

function test(nodes) {
  data_py_test = {
    "data.global": 1,
    "data.global.DF.__init__": 1,
    "data.global.DF.__str__": 1,
    "data.global.DF.save_to_html": 3,
    "data.global.Fixtures.__init__": 1,
  };

  let correct = 0;
  let total = 0;
  for (let key in data_py_test) {
    if (nodes[key].length == data_py_test[key]) {
      correct += 1;
    }
    total += 1;
  }
  let accuracy = correct / total;
  console.log("Accuracy:", accuracy * 100, "%");
}

function lookForDefinition(regex, type, line, stack, currentIndent, indentSize) {
  let found = false;
  let match = line.match(regex);
  if (match != null) {
    let indent = lineIndent(line, indentSize);
    currentIndent = adjustIndentation(indent, currentIndent, stack);

    stack.push({
      type: type,
      name: match.groups.name,
    });
    found = true;
  }
  return [currentIndent, found];
}

function lookForIfNameEqualsMain(line, stack, currentIndent, indentSize) {
  const ifNameEqualsMainRegex = /if __name__ == ['"]__main__['"]:/;
  let found = false;
  let match = line.match(ifNameEqualsMainRegex);
  if (match != null) {
    let indent = lineIndent(line, indentSize);
    currentIndent = adjustIndentation(indent, currentIndent, stack);
    found = true;
  }
  return [currentIndent, found]
}

function getCalledFunctions(line) {
  const calledFuncRegex = /(?<calledFunction>[A-Za-z0-9_.]*[A-Za-z_]+)\(/;
  // const calledFuncRegex = /(?<calledFunction>([a-zA-Z]+\([^\)]*\)(\.[^\)]*\))?))/;
  return [...line.matchAll(calledFuncRegex)];
}

function isUpperCase(str) {
  return str === str.toUpperCase();
}

function getClass(stack) {
  let funcsClass = null;

  for (let s of stack) {
    if (isUpperCase(s.name[0])) {
      funcsClass = s.name;
    }
  }

  return funcsClass;
}

function insertCalledFunctions(line, nodes, stack) {
  let found = getCalledFunctions(line);
  if (found.length > 0) {
    for (let i = 0; i < found.length; i++) {
      let func = "";
      for (let s of stack) {
        func += "." + s.name;
      }
      func = func.slice(1); // Remove dot from beginning
      if (!(func in nodes)) {
        nodes[func] = [];
      }
      let funcsClass = getClass(stack);
      nodes[func].push(
        found[i].groups.calledFunction.replace("self", funcsClass)
      );
    }
  }
}

function emptyParentesis(calledFunc) {
  let openIdxs = [];
  let closeIdxs = [];
  for (let i in calledFunc) {
    if (calledFunc[i] == "(") {
      openIdxs.push(i);
    } else if (calledFunc[i] == ")") {
      closeIdxs.push(i);
    }
  }

  let newCalledFunc = null;
  if (openIdxs.length == closeIdxs.length) {
    if (openIdxs[0] != closeIdxs[0] + 1) {
      newCalledFunc =
        calledFunc.slice(0, Number(openIdxs[0]) + 1) +
        calledFunc.slice(Number(closeIdxs[closeIdxs.length - 1]));
    }
  } else {
    console.log("Error:", calledFunc);
  }
  return newCalledFunc;
}

function formatStandardLibrary(calledFunc) {
  /* Standardise the format of calls to the functions in the Python standard library
     Assumes any func named append, insert, sort,.. etc is a list function
     Temporary solution, user may have own function called 'append'
     TODO: needs fixing */

  let newCalledFunc = calledFunc;

  let listFuncs = [
    "append",
    "insert",
    "sort",
    "extend",
    "pop",
    "reverse",
    "remove",
  ];

  let dictFuncs = ["values", "keys"];

  let parts = calledFunc.split(".");
  let func = parts[parts.length - 1];
  if (listFuncs.includes(func)) {
    newCalledFunc = "list." + func;
  } else if (dictFuncs.includes(func)) {
    newCalledFunc = "dict." + func;
  }

  return newCalledFunc;
}

function cleanNodes(nodes) {
  // Empty parentesis
  for (let func in nodes) {
    for (let i in nodes[func]) {
      nodes[func][i] = emptyParentesis(nodes[func][i]);
      nodes[func][i] = formatStandardLibrary(nodes[func][i]);
    }
  }
}

function collected(nodes) {
  let count = 0;
  for (let func in nodes) {
    count += nodes[func].length;
  }
  return count;
}

function fileText(path) {
  let s = path.replace(".py", "").split("/");
  return s[s.length - 1];
}

function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}

function removeStdLibFuncs(funcCalls) {
  let stdLibFuncs = ['abs', 'aiter', 'all', 'any', 'anext', 'ascii', 'bin', 'bool',
                     'breakpoint', 'bytearray', 'bytes', 'callable', 'chr', 'char', 
                     'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
                     'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
                     'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help',
                     'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter',
                     'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 
                     'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property',
                     'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
                     'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type',
                     'vars', 'zip', '__import__']
  for (let callingFunc in funcCalls) {
    for (let i in funcCalls[callingFunc]) {
      let calledFunc = funcCalls[callingFunc][i]
      if (stdLibFuncs.includes(calledFunc)) {
        funcCalls[callingFunc] = removeItemAll(funcCalls[callingFunc], calledFunc)
      }
    }
  }
}

function getFuncCalls(lines, path, includeStdLib) {
  let file = fileText(path);
  const classNameRegex = /class (?<name>[A-Za-z_]+)(\(.*\))?:/;
  const funcNameRegex = /def (?<name>[A-Za-z_]+)/;

  let line = null;
  let found = null;
  let funcCalls = {};
  let stack = [{ type: "global", name: file }];
  let indentSize = 4; // Spaces
  let currentIndent = 0;
  for (let index in lines) {
    line = lines[index];

    // Look for if __name__ == '__main__':
    [currentIndent, found] = lookForIfNameEqualsMain(line, stack, currentIndent, indentSize);
    if (found) {
      continue;
    }

    // Look for class definition
    [currentIndent, found] = lookForDefinition(classNameRegex, 'func', line, stack, currentIndent, indentSize)
    if (found) {
      continue;
    }

    // Look for function definition
    [currentIndent, found] = lookForDefinition(funcNameRegex, 'func', line, stack, currentIndent, indentSize)
    if (found) {
      continue;
    }

    // Look for a called function
    insertCalledFunctions(line, funcCalls, stack);
  }

  cleanNodes(funcCalls);
  if (includeStdLib) {
    removeStdLibFuncs(funcCalls);
  }
  return funcCalls;
}

function getFuncCounts(funcCalls) {
  // Count number of times each function is mentioned (for vis node size)
  let funcCounts = {};
  for (const func in funcCalls) {
    for (const funcCalled of funcCalls[func]) {
      if (!(func in funcCounts)) {
        funcCounts[func] = 0;
      }
      if (!(funcCalled in funcCounts)) {
        funcCounts[funcCalled] = 0;
      }

      funcCounts[func] += 1;
      funcCounts[funcCalled] += 1;
    }
  }
  return funcCounts;
}

function getCallCounts(funcCalls) {
  // Count number of times each function is called (for vis edge thickness)
  let callCounts = {};
  for (const func in funcCalls) {
    // Add any new called functions as nodes
    for (const calledFunc of funcCalls[func]) {
      let call = func + "->" + calledFunc;
      if (!(call in callCounts)) {
        callCounts[call] = 0;
      }
      callCounts[call] += 1;
    }
  }
  return callCounts;
}

function removeComments(code) {
  // Remove multiline comments
  code = code.replace(/(['"])\1\1[\d\D]*?\1{3}/g, '');
  // Remove inline comments
  code = code.replace(/#.*/g, '')
  return code;
}

function runFile(path, includeStdLib) {
  let data = {};
  try {
    let codeFile = fs.readFileSync(path, "utf8").toString()
    codeFile = removeComments(codeFile)
    let lines = codeFile.split("\r\n");

    let fileImports = collectImports(lines);

    let funcCalls = getFuncCalls(lines, path, includeStdLib);
    data["funcCalls"] = funcCalls;

    // Get func counts for node size
    let funcCounts = getFuncCounts(funcCalls);
    console.log(funcCounts);
    data["funcCounts"] = funcCounts;

    // Get call counts for edge thickness
    let callCounts = getCallCounts(funcCalls);
    data["callCounts"] = callCounts;

    console.log(data);
    // console.log('Functions collected:', collected(data))
  } catch (e) {
    console.log("Error:", e.stack);
  }

  return data;
}

function run(path, includeImports, includeStdLib) {
  if (includeImports == undefined) {
    includeImports = false;
  }
  if (includeStdLib == undefined) {
    includeStdLib = false;
  } 

  let data = runFile(path, includeStdLib);

  var saveJson = JSON.stringify(data, null, 4);
  fs.writeFile("./public/data.json", saveJson, "utf8", (err) => {
    if (err) {
      console.log(err);
    }
  });
}

module.exports = {
  run,
};

run('./code/main.py');
