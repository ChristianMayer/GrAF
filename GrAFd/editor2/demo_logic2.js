{
  "blocks": {
    "Memory1": {
      "type": "mathLib/memory",
      "x": 150, "y": 250, "width": 50, "height": 50,
      "parameters": { "initial_value": 1.0 },
      "flip" : true
    },
    "Gain1": {
      "type": "mathLib/gain",
      "x": 50, "y": 150, "width": 50, "height": 50,
      "parameters": { "gain": "__dt" }
    },
    "Sum1": {
      "type": "mathLib/sum",
      "x": 150, "y": 150, "width": 50, "height": 50,
      "parameters": {}
    },
    "Display22": {
      "type": "sinkLib/display",
      "x": 350, "y": 50, "width": 150, "height": 50,
      "parameters": {}
    },
    "Integral2": {
      "type": "mathLib/integral",
      "x": 250, "y": 150, "width": 50, "height": 50,
      "parameters": { "inital_value": 0.0 }
    },
    "Gain2": {
      "type": "mathLib/gain",
      "x": 150, "y": 50, "width": 50, "height": 50,
      "parameters": { "gain": -1.0 },
      "flip" : true
    },
    "Scope_2": {
      "type": "sinkLib/scope",
      "x": 350, "y": 150, "width": 600, "height": 300,
      "parameters": {}
    },
    "Subsystem5": {
      "type": "subsystem",
      "x": 600, "y": 100, "width": 100, "height": 100,
      "blocks": {
        "Sum1": {
          "type": "mathLib/sum",
          "x": 150, "y": 150, "width": 50, "height": 50,
          "parameters": {}
        },
        "Subsystem6": {
          "type": "subsystem",
          "x": 550, "y": 150, "width": 100, "height": 100,
          "blocks": {
          },
          "signals": [
          ]
        }
      },
      "signals": [
      ]
    }
  },
  "signals": [
    [ "Sum1"     , 0, "Integral2" , 0, {} ],
    [ "Gain1"    , 0, "Sum1"      , 0, {} ],
    [ "Sum1"     , 0, "Memory1"   , 0, {} ],
    [ "Memory1"  , 0, "Sum1"      , 1, {} ],
    [ "Integral2", 0, "Gain2"     , 0, {} ],
    [ "Gain2"    , 0, "Gain1"     , 0, {} ],
    [ "Integral2", 0, "Display22" , 0, {} ],
    [ "Integral2", 0, "Scope_2"   , 0, {} ]
  ]
}