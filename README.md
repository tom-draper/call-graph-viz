# Call-Graph-Visualiser

A Python function call graph visualiser.

![Example1](https://user-images.githubusercontent.com/41476809/139538533-8d4ab53d-4dd5-4cc4-a10d-93085f80e89b.png)

## Usage
Run the main.js file using node, followed by the Python file to visualise:

    node main [filename].py

### Command Line Arguments

#### -imports flag (Boolean)
If available, include Python files imported by the target file. Defaults to true.

    node main [filename].py -stdlib false

#### -stdlib flag (Boolean)
Include functions of the Python standard library. Defaults to false.

    node main [filename].py -imports true
