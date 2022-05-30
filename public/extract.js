const fs = require("fs");

function collectImports(lines) {
  let fileImports = { importOrigin: {}, simpleImports: [], aliases: {} };
  const fromImport = /from (?<origin>.*) import (?<import>.*)/;
  const aliasImport = /import (?<import>.*) as (?<alias>.*)/;
  const simpleImport = /^import (?<import>.[a-z0-9_.-]+)/;

  let match = null;
  for (let line of lines) {
    match = line.match(fromImport);
    if (match != null) {
      let imports = match.groups.import.split(", ");
      for (let _import of imports) {
        fileImports.importOrigin[_import] = match.groups.origin;
      }
    }

    match = line.match(simpleImport);
    if (match != null) {
      let imports = match.groups.import.split(", ");
      for (let _import of imports) {
        fileImports.simpleImports.push(_import);
      }
    }

    match = line.match(aliasImport);
    if (match != null) {
      fileImports.aliases[match.groups.import] = match.groups.alias;
    }
  }

  return fileImports;
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

function lookForDefinition(
  regex,
  type,
  line,
  stack,
  currentIndent,
  indentSize
) {
  let found = false;
  let match = line.match(regex);
  if (match != null) {
    let indent = lineIndent(line, indentSize);
    currentIndent = adjustIndentation(indent, currentIndent, stack);

    stack.push({
      type: type,
      name: match.groups.name,
      aliases: [],
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
  return [currentIndent, found];
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

  for (let i = stack.length - 1; i > 0; i--) {
    if (isUpperCase(stack[i].name[0])) {
      funcsClass = stack[i].name;
    }
  }

  return funcsClass;
}

function replaceAliases(calledFunc, aliases) {
  for (let original in aliases.fromImports) {
    let alias = aliases.fromImports[original];
    let regex = new RegExp(`\\b${alias}\\b`, "g");
    calledFunc = calledFunc.replace(regex, original);
  }
  for (let original in aliases.fromObjVars) {
    let alias = aliases.fromObjVars[original];
    let regex = new RegExp(`\\b${alias}\\b`, "g");
    calledFunc = calledFunc.replace(regex, original);
  }
  return calledFunc;
}

function replaceAliases2(calledFunc, stack) {
  let aliases = stack[0].aliases.fromImports;
  for (let original in aliases) {
    let alias = stack[0].aliases.fromImports[original];
    let regex = new RegExp(`\\b${alias}\\b`, "g");
    calledFunc = calledFunc.replace(regex, original);
  }

  aliases = stack[0].aliases.fromObjVars;
  for (let original in aliases) {
    let alias = stack[0].aliases.fromObjVars[original];
    let regex = new RegExp(`\\b${alias}\\b`, "g");
    calledFunc = calledFunc.replace(regex, original);
  }
  return calledFunc;
}

function insertCalledFunctions(line, funcCalls, stack) {
  let match = getCalledFunctions(line);
  if (match.length > 0) {
    for (let i = 0; i < match.length; i++) {
      let callingFunc = "";
      for (let s of stack) {
        callingFunc += "." + s.name;
      }
      callingFunc = callingFunc.slice(2); // Remove dot from beginning
      if (!(callingFunc in funcCalls)) {
        funcCalls[callingFunc] = [];
      }
      let funcsClass = getClass(stack);

      // Format called function
      let calledFunc = match[i].groups.calledFunction;
      calledFunc = calledFunc.replace("self", funcsClass);

      funcCalls[callingFunc].push(calledFunc);
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

  let dictFuncs = ["values", "keys", "items"];

  let strFuncs = ["split", "upper", "lower", "title", "replace"];

  let parts = calledFunc.split(".");
  let func = parts[parts.length - 1];
  if (listFuncs.includes(func)) {
    newCalledFunc = "list." + func;
  } else if (dictFuncs.includes(func)) {
    newCalledFunc = "dict." + func;
  } else if (strFuncs.includes(func)) {
    newCalledFunc = "str." + func;
  }

  return newCalledFunc;
}

function cleanFuncCalls(nodes, aliases) {
  // Empty parentesis
  for (let func in nodes) {
    for (let i in nodes[func]) {
      nodes[func][i] = emptyParentesis(nodes[func][i]);
      nodes[func][i] = formatStandardLibrary(nodes[func][i]);
      nodes[func][i] = replaceAliases(nodes[func][i], aliases);
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
  let stdLibFuncs = [
    "abs",
    "aiter",
    "all",
    "any",
    "anext",
    "ascii",
    "bin",
    "bool",
    "breakpoint",
    "bytearray",
    "bytes",
    "callable",
    "chr",
    "char",
    "classmethod",
    "compile",
    "complex",
    "delattr",
    "dict",
    "dir",
    "divmod",
    "enumerate",
    "eval",
    "exec",
    "filter",
    "float",
    "format",
    "frozenset",
    "getattr",
    "globals",
    "hasattr",
    "hash",
    "help",
    "hex",
    "id",
    "input",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "len",
    "list",
    "locals",
    "map",
    "max",
    "memoryview",
    "min",
    "next",
    "object",
    "oct",
    "open",
    "ord",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "set",
    "setattr",
    "slice",
    "sorted",
    "staticmethod",
    "str",
    "sum",
    "super",
    "tuple",
    "type",
    "vars",
    "zip",
    "__import__",
  ];
  for (let callingFunc in funcCalls) {
    for (let i in funcCalls[callingFunc]) {
      let calledFunc = funcCalls[callingFunc][i];
      if (stdLibFuncs.includes(calledFunc)) {
        funcCalls[callingFunc] = removeItemAll(
          funcCalls[callingFunc],
          calledFunc
        );
      }
    }
  }
}

function addAlises(line, aliases) {
  let match = line.match(/(?<alias>[^\s]*) = (?<original>[A-Z][^\s]*)\(/);
  if (match != null) {
    // TODO: Improve such that aliases can be also available in called function
    // where alias is passed as arg
    aliases.fromObjVars[match.groups.original] = match.groups.alias;
  }
}

function getFuncCalls(lines, path, existingAliases, includeStdLib) {
  let fileImports = collectImports(lines);
  console.log(fileImports.aliases);

  let file = fileText(path);
  const classNameRegex = /class (?<name>[A-Za-z_]+)(\(.*\))?:/;
  const funcNameRegex = /def (?<name>[A-Za-z_]+)/;

  let line = null;
  let found = null;
  let funcCalls = {};
  let stack = [{ type: "global", name: "" }];
  let aliases = {
    fromImports: fileImports.aliases,
    fromObjVars: existingAliases,
  };
  let indentSize = 4; // Spaces
  let currentIndent = 0;
  for (let index in lines) {
    line = lines[index];

    addAlises(line, aliases);

    // Look for if __name__ == '__main__':
    [currentIndent, found] = lookForIfNameEqualsMain(
      line,
      stack,
      currentIndent,
      indentSize
    );
    if (found) {
      continue;
    }

    // Look for class definition
    [currentIndent, found] = lookForDefinition(
      classNameRegex,
      "func",
      line,
      stack,
      currentIndent,
      indentSize
    );
    if (found) {
      continue;
    }

    // Look for function definition
    [currentIndent, found] = lookForDefinition(
      funcNameRegex,
      "func",
      line,
      stack,
      currentIndent,
      indentSize
    );
    if (found) {
      continue;
    }

    // Look for a called function
    insertCalledFunctions(line, funcCalls, stack);
  }

  // TODO: remove
  if ("Utilities" in funcCalls) {
    for (let i = funcCalls.Utilities.length - 1; i > 0; i--) {
      if (funcCalls.Utilities[i] == "rgb") {
        funcCalls.Utilities.splice(i, i);
      }
    }
  }

  cleanFuncCalls(funcCalls, aliases);
  if (!includeStdLib) {
    removeStdLibFuncs(funcCalls);
  }

  // Return aliases to be used when extracting any remaining Python files, incase
  // they are passed into a function within that file
  return [funcCalls, aliases.fromObjVars];
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
  code = code.replace(/(['"])\1\1[\d\D]*?\1{3}/g, "");
  // Remove inline comments
  code = code.replace(/#.*/g, "");
  return code;
}

function runFile(path, includeStdLib) {
  let parts = path.split("/");
  let filename = parts[parts.length - 1];
  console.log("Extracting:", filename);

  let funcCalls = {};
  let aliases = {};
  try {
    let codeFile = fs.readFileSync(path, "utf8").toString();
    codeFile = removeComments(codeFile);
    let lines = codeFile.split("\r\n");

    [funcCalls, aliases] = getFuncCalls(lines, path, aliases, includeStdLib);
  } catch (e) {
    console.log("Error:", e.stack);
  }

  return funcCalls;
}

function getImportedFiles(path) {
  let importedFiles = [];
  let codeFile;
  try {
    codeFile = fs.readFileSync(path, "utf8").toString();
  } catch (e) {
    console.log("Error:", e.stack);
  }

  let matches = [...codeFile.matchAll(/from (?<filename>.*) import/g)];
  for (let match of matches) {
    let filename = match.groups.filename + ".py";
    try {
      let importedFilePath = "./code/" + filename;
      fs.readFileSync(importedFilePath, "utf8").toString(); // Attempt
      importedFiles.push(importedFilePath);
    } catch (e) {
      console.log("Error: Cannot fetch", filename);
    }
  }

  return importedFiles;
}

function getVisData(paths, includeStdLib) {
  // TODO: Improve merging such that same functions defined in different files
  // Test with optimise.py and utilities.py
  let funcCalls = {};
  for (let path of paths) {
    let newFuncCalls = runFile(path, includeStdLib);
    funcCalls = { ...funcCalls, ...newFuncCalls };
  }

  // Get func counts for node size
  let funcCounts = getFuncCounts(funcCalls);

  // Get call counts for edge thickness
  let callCounts = getCallCounts(funcCalls);

  let data = {
    funcCalls: funcCalls,
    funcCounts: funcCounts,
    callCounts: callCounts,
  };
  return data;
}

function run(filepath, includeImports, includeStdLib) {
  if (includeImports == undefined) {
    includeImports = false;
  }
  if (includeStdLib == undefined) {
    includeStdLib = true;
  }

  let paths = [filepath];
  if (includeImports) {
    let importedFiles = getImportedFiles(filepath);
    paths = paths.concat(importedFiles);
  }

  let data = getVisData(paths, includeStdLib);

  // console.log(data)

  var saveJson = JSON.stringify(data, null, 4);
  fs.writeFileSync("./public/data.json", saveJson, "utf8", (err) => {
    if (err) {
      console.log(err);
    }
  });
}

module.exports = {
  run,
};

// run("./code/optimise.py", true, true);
