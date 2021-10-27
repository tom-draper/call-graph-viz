function onLoad(nodes) {

  // var graphGenerator = Viva.Graph.generator()
  var graph = Viva.Graph.graph()
  // var graph = graphGenerator.path(10)
  var container = document.body

  
  // Create nodes
  let nodeIds = {}
  let id = 0
  for (const func in nodes) {
    // Add defined function as node
    console.log(func)
    graph.addNode(id, {name: func})
    nodeIds[func] = id
    id += 1

    // Add any new called functions as nodes
    for (const calledFunc of nodes[func]) {
      if (!(calledFunc in nodeIds)) {
        graph.addNode(id, {name: calledFunc})
        nodeIds[calledFunc] = id
        id += 1
      }
    }
  }

  console.log(nodeIds)

  // Connect nodes
  for (const func in nodes) {
    // Add any new called functions as nodes
    for (const calledFunc of nodes[func]) {
      console.log(nodeIds[func], nodeIds[calledFunc])
      graph.addLink(nodeIds[func], nodeIds[calledFunc])
    }
  }

  console.log(graph);

  // first we generate DOM label for each graph node. Be cautious
  // here, since for large graphs with more than 1k nodes, this will
  // become a bottleneck.
  var domLabels = generateDOMLabels(graph)

  var layout = Viva.Graph.Layout.forceDirected(graph, {
    springLength: 100,
    springCoeff: 0.0008,
    dragCoeff: 0.02,
    gravity: -1.2,
  })

  var graphics = Viva.Graph.View.webglGraphics()
  graphics.placeNode(function (ui, pos) {
    // This callback is called by the renderer before it updates
    // node coordinate. We can use it to update corresponding DOM
    // label position;

    // we create a copy of layout position
    var domPos = {
      x: pos.x,
      y: pos.y,
    }
    // And ask graphics to transform it to DOM coordinates:
    graphics.transformGraphToClientCoordinates(domPos)

    // then move corresponding dom label to its own position:
    var nodeId = ui.node.id
    var labelStyle = domLabels[nodeId].style
    labelStyle.left = domPos.x + 'px'
    labelStyle.top = domPos.y + 'px'
  })

  var renderer = Viva.Graph.View.renderer(graph, {
    layout: layout,
    graphics: graphics,
    container: container,
  })

  renderer.run()

  function generateDOMLabels(graph) {
    // this will map node id into DOM element
    var labels = Object.create(null)
    graph.forEachNode(function (node) {
      var label = document.createElement('span')
      label.classList.add('node-label')
      label.innerText = node.data.name
      labels[node.id] = label
      container.appendChild(label)
    })
    // NOTE: If your graph changes over time you will need to
    // monitor graph changes and update DOM elements accordingly
    return labels
  }
}
