{
  "targets": [
    {
      "target_name": "enet_wrapper",
      "sources": [ "src/net/EnetWrapper.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../LOGIC DARI C++/enet_new/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "link_settings": {
        "libraries": [
          "-lws2_32.lib",
          "-lwinmm.lib"
        ]
      },
      "conditions": [
        ["OS=='win'", {
          "defines": [ "_HAS_EXCEPTIONS=1", "ENET_DLL" ],
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
