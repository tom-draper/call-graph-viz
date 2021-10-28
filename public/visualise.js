function isUpperCase(str) {
  return str === str.toUpperCase();
}

function getClass(func) {
  let parts = func.split('.')
  for (let part of parts) {
    if (part != null && part != '') {
      if (isUpperCase(part[0])) {
        return part
      }
    }
  }
  return null
}

function randomColor() {
  return "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
}

// From https://gist.github.com/bendc/76c48ce53299e6078a76

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

function randomColour() {
  var h = randomInt(0, 360);
  var s = randomInt(42, 98);
  var l = randomInt(40, 90);
  return `hsl(${h},${s}%,${l}%)`;
}

function buildNextNode(id, func, groups, classes, counts) {
  let nextNode = null;

  let parts = func.split('.')
  let label = parts[parts.length-1]
  let funcClass = getClass(func)

  if (funcClass != null) {
    nextNode = {'id': id, 'label': label, 'group': funcClass, 'value': counts}
    if (!(funcClass in groups)) {
      let colour = randomColour();
      groups[funcClass] = {
        color: {
          background: colour,
        },
      }
      classes[funcClass] = colour
    }
  } else {
      nextNode = {'id': id, 'label': label, 'value': counts}
  }
  return nextNode
}

function visualise(funcMap) {

  // Count number of times each function is mentioned (for vis node size)
  let funcCounts = {}
  for (const func in funcMap) {
    for (const funcCalled of funcMap[func]) {
      console.log(func, funcCalled)
      if (!(func in funcCounts)) {
        funcCounts[func] = 0
      }
      if (!(funcCalled in funcCounts)) {
        funcCounts[funcCalled] = 0
      }

      funcCounts[func] += 1
      funcCounts[funcCalled] += 1
    }
  }

  console.log(funcCounts)

  // Create nodes
  let nodeIds = {}
  let id = 0
  let groups = {}
  let classes = {}
  let n = []
  for (const func in funcMap) {
    // Add defined function as node
    let count = funcCounts[func]

    let nextNode = buildNextNode(id, func, groups, classes, count)

    n.push(nextNode)
    nodeIds[func] = id
    id += 1

    // Add any new called functions as nodes
    for (const calledFunc of funcMap[func]) {
      if (!(calledFunc in nodeIds)) {
        let count = funcCounts[calledFunc]

        let nextNode = buildNextNode(id, calledFunc, groups, classes, count)

        n.push(nextNode)
        nodeIds[calledFunc] = id
        id += 1
      }
    }
  }

  console.log(n)

  var nodes = new vis.DataSet(n);

  let e = []

  // Count number of times each function is called (for vis edge thickness)
  let callCounts = {}
  for (const func in funcMap) {
    console.log(func)
    // Add any new called functions as nodes
    for (const calledFunc of funcMap[func]) {
      if (!(nodeIds[func] + '->' + nodeIds[calledFunc] in callCounts)) {
        callCounts[nodeIds[func] + '->' + nodeIds[calledFunc]] = 0
      }
      callCounts[nodeIds[func] + '->' + nodeIds[calledFunc]] += 1
    }
  }

  for (const func in callCounts) {
    let fromAndTo = func.split('->')
    let from = fromAndTo[0]
    let to = fromAndTo[1]
    // console.log(from, to);
    let count = callCounts[func]
    e.push({'from': from, 'to': to, 'value': count})
  }

  var edges = new vis.DataSet(e)

  // create a network
  var container = document.getElementById('mynetwork')

  // provide the data in the vis format
  var data = {
    nodes: nodes,
    edges: edges,
  }
  var options = {
    layout: {improvedLayout: false},
    // groups: groups,
    edges: {value: 1, color: {opacity: 0.65}, arrows: {to: {enabled: true, scaleFactor: 0.5}}},
    nodes: {shape: 'dot', value: 0.1, opacity: 0.9}
  }

  var network = new vis.Network(container, data, options)

  let banner = document.getElementById('banner')
  for (let funcClass in classes) {
    let htmlString = '<div class="function-class" style="background-color:' + classes[funcClass] + '">' + funcClass + '</div>'
    banner.innerHTML += htmlString;
  }
}