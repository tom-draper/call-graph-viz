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

function randomColour() {
  return "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
}

function buildNextNode(id, label, func, groups, classes) {
  let nextNode = null;
  let funcClass = getClass(func)
  if (funcClass != null) {
    nextNode = {'id': id, 'label': label, 'group': funcClass}
    if (!(funcClass in groups)) {
      let colour = randomColour();
      groups[funcClass] = {
        shape: 'circle',
        color: {
          border: 'black',
          background: colour,
          highlight: {
            border: 'yellow',
            background: 'orange'
          }
        },
        fontSize: 18
      }
      classes[funcClass] = colour
    }
  } else {
      nextNode = {'id': id, 'label': label}
  }
  return nextNode
}

function visualise(funcMap) {
  // Create nodes
  let nodeIds = {}
  let id = 0
  let groups = {}
  let classes = {}
  let n = []
  for (const func in funcMap) {
    // Add defined function as node
    let parts = func.split('.')
    let label = parts[parts.length-1]

    let nextNode = buildNextNode(id, label, func, groups, classes)

    n.push(nextNode)
    nodeIds[func] = id
    id += 1

    // Add any new called functions as nodes
    for (const calledFunc of funcMap[func]) {
      if (!(calledFunc in nodeIds)) {
        let parts = calledFunc.split('.')
        let label = parts[parts.length-1]

        let nextNode = buildNextNode(id, label, calledFunc, groups, classes)

        n.push(nextNode)
        nodeIds[calledFunc] = id
        id += 1
      }
    }
  }

  console.log(groups)
  console.log(classes)

  var nodes = new vis.DataSet(n);

  let e = []

  let callCounts = {}
  // Connect nodes
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
    value: 1,
    edges: {arrows: {to: {enabled: true, scaleFactor: 0.5}}}
  }

  var network = new vis.Network(container, data, options)

  let banner = document.getElementById('banner')
  for (let funcClass in classes) {
    let htmlString = '<div class="function-class" style="background-color:' + classes[funcClass] + '">' + funcClass + '</div>'
    banner.innerHTML += htmlString;
  }
}