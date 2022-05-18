# Call-Graph-Visualiser

A Python function call graph visualiser tool to help you visualise the complexity and structure of your Python programs.

![Example2](https://user-images.githubusercontent.com/41476809/139538596-ed31f372-2c31-4e9a-9bb1-871411bb8a8a.png)

## Usage
Run the main.js file using node, followed by the Python file to visualise:

    node main [filename].py

### Command Line Arguments

#### imports flag (Boolean)
If available, include Python files imported by the target file. Defaults to true.

    node main [filename].py -stdlib false

#### stdlib flag (Boolean)
Include functions of the Python standard library. Defaults to false.

    node main [filename].py -imports true
