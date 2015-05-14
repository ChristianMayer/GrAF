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
    "IntegralX": {
      "type": "mathLib/integral",
      "x": 250, "y": 250, "width": 50, "height": 50,
      "parameters": { "inital_value": 0.0 },
      "rotation": 90
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
    { "source": "Sum1"     , "sourcePort": 0, "waypoints": [
      { "target": "Integral2", "targetPort": 0 },
      { "target": "Memory1"  , "targetPort": 0 }
    ] },
    { "source": "Gain1"    , "sourcePort": 0, "target": "Sum1"     , "targetPort": 0 },
    { "source": "Memory1"  , "sourcePort": 0, "target": "Sum1"     , "targetPort": 1 },
    { "source": "Integral2", "sourcePort": 0, "waypoints": [
      { "target": "Gain2"    , "targetPort": 0 },
      { "target": "Display22", "targetPort": 0 }, 
      { "target": "Scope_2"  , "targetPort": 0 }
    ] },
    { "source": "Gain2"    , "sourcePort": 0, "target": "Gain1"    , "targetPort": 0 }
  ]
}