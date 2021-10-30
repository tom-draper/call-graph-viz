function isUpperCase(str) {
  return str === str.toUpperCase();
}

function getClass(func) {
  let parts = func.split(".");
  for (let part of parts) {
    if (part != null && part != "") {
      if (isUpperCase(part[0])) {
        return part;
      }
    }
  }
  return null;
}

function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()
  );
}

// From https://gist.github.com/bendc/76c48ce53299e6078a76

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

function randomColour() {
  let h = randomInt(0, 360);
  let s = randomInt(25, 70);
  let l = randomInt(10, 85);
  let colour = `hsl(${h},${s}%,${l}%)`;
  let highlight = `hsl(${h},${s}%,${l * 0.9}%)`; // Darker
  return [colour, highlight];
}

function newShade(colour, amount) {
  return (
    "#" +
    colour
      .replace(/^#/, "")
      .replace(/../g, (colour) =>
        (
          "0" +
          Math.min(255, Math.max(0, parseInt(colour, 16) + amount)).toString(16)
        ).substr(-2)
      )
  );
}

function selectColour(colours) {
  let colour = null;
  if (colours.length <= 0) {
    colour = randomColor();
  } else {
    let i = randomInt(0, colours.length-1);
    colour = colours.splice(i, 1)[0];  // Remove from list
    console.log(colour, colours)
  }
  return colour;
}

function addBanner(classes) {
  let banner = document.getElementById("banner");
  banner.innerHTML = "";
  for (let funcClass in classes) {
    let htmlString =
      '<div class="function-class" style="background-color:' +
      classes[funcClass] +
      '">' +
      funcClass +
      "</div>";
    banner.innerHTML += htmlString;
  }
}

function buildNextNode(id, func, groups, classes, counts, colours) {
  let nextNode = null;

  let parts = func.split(".");
  let label = parts[parts.length - 1];
  let funcClass = getClass(func);

  if (funcClass != null) {
    nextNode = { id: id, label: label, group: funcClass, value: counts };
    if (!(funcClass in groups)) {
      let colour = selectColour(colours);
      console.log(colour)
      let highlight = newShade(colour, -70);
      groups[funcClass] = {
        useDefaultGroups: true,
        color: {
          border: highlight,
          background: colour,
        },
      };
      classes[funcClass] = colour;
    }
  } else {
    nextNode = { id: id, label: label, value: counts };
  }

  return nextNode;
}

function globalCall(callingFunc) {
  // Check if function was called from outside any function/class
  return callingFunc == "";
}

function createEdges(callCounts, nodeIds) {
  let e = [];
  for (const func in callCounts) {
    let [from, to] = func.split("->");
    // If the function was called at the top level of the file, outside of any
    // functions then 'from' is the name of a Python file and is not an existing node
    // No edge will be made -> 'to' may be a floating node
    if (!globalCall(from)) {
      let count = callCounts[func];
      // console.log('Edge', from, to, { from: nodeIds[from], to: nodeIds[to], value: count })
      e.push({ from: nodeIds[from], to: nodeIds[to], value: count });
    }
  }
  let edges = new vis.DataSet(e);
  return edges;
}

function createNodes(funcCalls, funcCounts) {
  let colours = [
    "#ffa609", // Orange
    "#6f6cfe", // Purple
    // "#7ce03b", // Green
    // "#ED2939", // Red
    // "#fefd05", // Yellow
    "#00468C", // Blue
    // "#fb7f81", // Salmon
    // "#800000", // Maroon
    "#008080", // Teal
    // "#008000", // Dark green
    "#C71585",
    "#FF00FF",
    "#00FFFF",
  ];

  let nodeIds = {};
  let id = 0;
  let groups = {};
  let classes = {};
  let n = [];
  for (const callingFunc in funcCalls) {
    // If called function was not called from within another function
    if (!(callingFunc in nodeIds) && !globalCall(callingFunc)) {
      // Add defined function as node
      let count = funcCounts[callingFunc];

      let nextNode = buildNextNode(
        id,
        callingFunc,
        groups,
        classes,
        count,
        colours
      );

      n.push(nextNode);
      nodeIds[callingFunc] = id;
      id += 1;
    }

    // Add any new called functions as nodes
    for (const calledFunc of funcCalls[callingFunc]) {
      if (!(calledFunc in nodeIds)) {
        let count = funcCounts[calledFunc];

        let nextNode = buildNextNode(
          id,
          calledFunc,
          groups,
          classes,
          count,
          colours
        );

        n.push(nextNode);
        nodeIds[calledFunc] = id;
        id += 1;
      }
    }
  }
  let nodes = new vis.DataSet(n);
  return [nodes, nodeIds, groups, classes];
}

function createNetwork(nodes, edges, groups) {
  let container = document.getElementById("mynetwork");

  let data = {
    nodes: nodes,
    edges: edges,
  };
  let options = {
    layout: { improvedLayout: false },
    groups: groups,
    edges: {
      value: 1,
      color: { opacity: 0.65, inherit: "from" },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    },
    nodes: { shape: "dot", value: 2, opacity: 0.85, borderWidth: 1 },
  };

  new vis.Network(container, data, options); // Displays network
}

function visualise(data) {
  let funcCalls = data["funcCalls"];
  let funcCounts = data["funcCounts"];
  let callCounts = data["callCounts"];

  let [nodes, nodeIds, groups, classes] = createNodes(funcCalls, funcCounts);

  addBanner(classes);

  let edges = createEdges(callCounts, nodeIds);

  createNetwork(nodes, edges, groups);
}
