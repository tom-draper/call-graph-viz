# Call Graph Visualiser

A Python function call graph visualiser tool to help you visualise the complexity and structure of your Python programs.

Each node is a Python function and the directed connections drawn between them represent function calls. The thickness of the connection represents the number of times the function call is made. Nodes are colour coded by the class they belong to.

![Example2](https://user-images.githubusercontent.com/41476809/139538596-ed31f372-2c31-4e9a-9bb1-871411bb8a8a.png)

## Usage

Copy the Python code you wish to visualise into the <code>/code</code> directory.

Run the <code>main.js</code> file using node, followed by the name of the Python file to visualise:

    node main <filename>.py

### Command Line Arguments

#### imports flag (Boolean)
If available, include Python files imported by the target file. Defaults to true.

    node main <filename>.py -stdlib false

#### stdlib flag (Boolean)
Include functions of the Python Standard Library. Defaults to false.

    node main <filename>.py -imports true
