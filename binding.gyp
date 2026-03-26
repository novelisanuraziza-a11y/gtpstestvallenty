{
  "targets": [
    {
      "target_name": "enet_wrapper",
      "sources": [ "src/net/EnetWrapper.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "enet_new/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "link_settings": {
        "libraries": [
          "-lws2_32.lib",
          "-lwinmm.lib",
          "../enet_new/lib/enet.lib"
        ]
      },
      "conditions": [
        ["OS=='win'", {
          "defines": [ "_HAS_EXCEPTIONS=1" ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }]
      ]
    }
  ]
}
