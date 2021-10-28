function isUpperCase(str) {
  return str === str.toUpperCase()
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
  return (
    '#' +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()
  )
}

// From https://gist.github.com/bendc/76c48ce53299e6078a76

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomColour() {
  let h = randomInt(0, 360)
  let s = randomInt(25, 70)
  let l = randomInt(10, 85)
  let colour = `hsl(${h},${s}%,${l}%)`
  let highlight = `hsl(${h},${s}%,${l * 0.9}%)` // Darker
  return [colour, highlight]
}

function newShade(color, amount) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function getColour(groups) {
  let colourStack = [
    '#ffa609',  // Orange
    '#6f6cfe',  // Purple
    '#7ce03b',  // Green
    '#ED2939',  // Red
    '#fefd05',  // Yellow
    '#00468C',  // Blue
    '#fb7f81',  // Salmon
    '#800000',  // Maroon
    '#008080',  // Teal
    '#008000',  // Dark green
    '#FFD700',  // Gold
    '#C71585', 
    '#FF00FF', 
    '#00FFFF', 
  ]

  console.log(groups)
  console.log(Object.keys(groups).length);
  if (Object.keys(groups).length > colourStack.length) {
    return randomColor()
  }
  return colourStack[Object.keys(groups).length]
}

function buildNextNode(id, func, groups, classes, counts) {
  let nextNode = null

  let parts = func.split('.')
  let label = parts[parts.length - 1]
  let funcClass = getClass(func)

  if (funcClass != null) {
    nextNode = { id: id, label: label, group: funcClass, value: counts }
    if (!(funcClass in groups)) {
      let colour = getColour(groups)
      let highlight = newShade(colour, -70);
      console.log(highlight)
      groups[funcClass] = {
        useDefaultGroups: true,
        color: {
          border: highlight,
          background: colour,
          // highlight: {
          //   border: highlight,
          //   background: 'orange'
          // }
        },
      }
      classes[funcClass] = colour
    }
  } else {
    nextNode = { id: id, label: label, value: counts }
  }
  return nextNode
}

function visualise(funcMap) {
  // Count number of times each function is mentioned (for vis node size)
  let funcCounts = {}
  for (const func in funcMap) {
    for (const funcCalled of funcMap[func]) {
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

  var nodes = new vis.DataSet(n)

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
    e.push({ from: from, to: to, value: count })
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
    layout: { improvedLayout: false },
    groups: groups,
    edges: {
      value: 1,
      color: { opacity: 0.65, inherit: 'from' },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    },
    nodes: { shape: 'dot', value: 0.1, opacity: 0.85, borderWidth: 1 },
  }

  var network = new vis.Network(container, data, options)

  let banner = document.getElementById('banner')
  for (let funcClass in classes) {
    let htmlString =
      '<div class="function-class" style="background-color:' +
      classes[funcClass] +
      '">' +
      funcClass +
      '</div>'
    banner.innerHTML += htmlString
  }
}
