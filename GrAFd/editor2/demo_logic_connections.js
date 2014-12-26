{
  "blocks": {
    "leerer Pfeil": {
      "type": "subsystem",
      "x": 25, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 225, 120 ]
        ] }
      ]
    },
    "leerer Pfeil knick": {
      "type": "subsystem",
      "x": 100, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 225, 120 ], [ 225, 45 ]
        ] }
      ]
    },
    "leerer Pfeil\nviel knick": {
      "type": "subsystem",
      "x": 185, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 225, 120 ], [ 225, 45 ], [ 60, 45 ], [ 60, 180 ], [ 245, 180 ], [ 245, 100 ]
        ] }
      ]
    },
    "leerer Pfeil Branch": {
      "type": "subsystem",
      "x": 260, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 170, 120 ],
          { "waypoints": [ [225, 120] ] },
          { "waypoints": [ [170, 180] ] }
        ] }
      ]
    },
    "leerer Pfeil Branch\nknick": {
      "type": "subsystem",
      "x": 370, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 105, 85 ], [ 150, 85 ],
          { "waypoints": [ [150, 180], [170, 180] ] },
          { "waypoints": [ [225,  85], [225, 120] ] }
        ] }
      ]
    },
    "leerer Pfeil Branch viel knick": {
      "type": "subsystem",
      "x": 470, "y": 20, "width": 40, "height": 60,
      "blocks": {
      },
      "signals": [
        { "waypoints": [
          [ 105, 120 ], [ 65, 120 ], [ 65, 45 ], [150, 45], [150, 80],
          { "waypoints": [ [185,  80], [185,  35], [225,  35], [225, 115] ] },
          { "waypoints": [ [150, 135], [220, 135], [220, 175] ] }
        ] }
      ]
    },
    "Verbindungen": {
      "type": "subsystem",
      "x": 25, "y": 165, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 135, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 80, "y": 25, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "Gain", "sourcePort": 0, "target": "Out1", "targetPort": 0 },
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0 }
      ]
    },
    "Verbindungen knick": {
      "type": "subsystem",
      "x": 115, "y": 165, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 135, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 80, "y": 75, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "Gain", "sourcePort": 0, "target": "Out1", "targetPort": 0, "waypoints": [
          [ 115, 40 ]
        ] },
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0, "waypoints": [
          [ 65, 40 ]
        ] }
      ]
    },
    "Verbindungen\nviel knick": {
      "type": "subsystem",
      "x": 215, "y": 165, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 175, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 90, "y": 95, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "Gain", "sourcePort": 0, "target": "Out1", "targetPort": 0, "waypoints": [
          [ 125, 75 ], [ 145, 75 ], [ 145, 40 ]
        ] },
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0, "waypoints": [
          [ 60, 70 ], [ 70, 70 ], [ 70, 110 ]
        ] }
      ]
    },
    "Verbindungen\nbranch offen": {
      "type": "subsystem",
      "x": 300, "y": 165, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 175, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 80, "y": 25, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "Gain", "sourcePort": 0, "waypoints": [
          [ 135, 40 ],
          { "target": "Out1", "targetPort": 0 },
          { "waypoints": [ [ 135, 110 ] ] }
        ] },
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0 }
      ]
    },
    "Verbindungen\nbranch offen knick": {
      "type": "subsystem",
      "x": 385, "y": 165, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 175, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 80, "y": 25, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "Gain", "sourcePort": 0, "waypoints": [
          [ 115, 50 ], [ 135, 50 ],
          { "waypoints": [ [ 135, 90 ], [ 190, 90 ], [ 190, 120 ] ] },
          { "target": "Out1", "targetPort": 0, "waypoints": [ [ 160, 50 ] ] }
        ] },
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0 }
      ]
    },
    "Verbindungen\nbranch alles": {
      "type": "subsystem",
      "x": 480, "y": 160, "width": 40, "height": 60,
      "blocks": {
        "In1": {
          "type": "sourceLib/in",
          "x": 25, "y": 33, "width": 30, "height": 14
        },
        "Out1": {
          "type": "sinkLib/out",
          "x": 175, "y": 33, "width": 30, "height": 14
        },
        "Gain": {
          "type": "mathLib/gain",
          "x": 80, "y": 25, "width": 30, "height": 30
        },
        "Gain1": {
          "type": "mathLib/gain",
          "rotation": 270,
          "flip": true,
          "x": 55, "y": 180, "width": 30, "height": 30
        },
        "Gain2": {
          "type": "mathLib/gain",
          "rotation": 270,
          "flip": true,
          "x": 45, "y": 85, "width": 30, "height": 30
        }
      },
      "signals": [
        { "source": "In1", "sourcePort": 0, "target": "Gain", "targetPort": 0 },
        { "source": "Gain", "sourcePort": 0, "waypoints": [
          [ 115, 65 ], [ 135, 65 ],
          { "target": "Out1", "targetPort": 0, "waypoints": [ [ 160, 65 ] ] },
          { "waypoints": [ [ 135, 105 ], [ 150, 105 ],
            { "waypoints": [ [ 190, 105 ], [ 190, 135 ] ] },
            { "waypoints": [ [ 150, 140 ], [ 125, 140 ], [ 125, 155 ],
              { "waypoints": [ [ 95, 155 ], [ 95, 140 ],
                { "waypoints": [ [  95, 130 ], [ 45, 130 ] ] },
                { "target": "Gain1", "targetPort": 0, "waypoints": [ [  80, 140 ], [ 80, 165 ] ] },
                { "waypoints": [ [ 110, 140 ], [ 110,  95 ], [ 115,  95 ] ] }
              ] },
              { "waypoints": [ [ 125, 180 ], [ 165, 180 ],
                { "waypoints": [ [ 165, 205 ], [ 215, 205 ] ] },
                { "waypoints": [ [ 205, 180 ],
                  { "waypoints": [ [ 225, 180 ] ] },
                  { "waypoints": [ [ 205,  80 ], [ 225,  80 ] ] }
                ] }
              ] }
            ] }
          ] }
        ] },
        { "target": "Gain2", "targetPort": 0, "waypoints": [ [ 10, 20 ], [ 10, 70 ] ] }
      ]
    }
  },
  "signals": [
    { "waypoints": [
      [ 75, 140 ], [ 195, 140 ]
    ] }
  ]
}