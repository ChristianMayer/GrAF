#!/bin/bash

cd editor
python -c 'import SimpleHTTPServer,BaseHTTPServer; BaseHTTPServer.HTTPServer(("", 8080), SimpleHTTPServer.SimpleHTTPRequestHandler).serve_forever()'
