{
  'variables': {
      'std%':'c++11'
  },
  'includes': [ 'common.gypi' ],
  'targets': [
    {
      'target_name': 'action_before_build',
      'type': 'none',
      'hard_dependency': 1,
      'actions': [
        {
          'action_name': 'run_protoc',
          'inputs': [
            './proto/index.proto'
          ],
          'outputs': [
            "<(SHARED_INTERMEDIATE_DIR)/index.pb.cc"
          ],
          'action': ['protoc','-Iproto/','--cpp_out=<(SHARED_INTERMEDIATE_DIR)/','./proto/index.proto']
        }
      ]
    },
    {
      'target_name': 'binding',
      'dependencies': [ 'action_before_build' ],
      'sources': [
        "./src/binding.cpp",
        "<(SHARED_INTERMEDIATE_DIR)/index.pb.cc"
      ],
      "include_dirs" : [
          'src/',
          '<(SHARED_INTERMEDIATE_DIR)/',
          "<!(node -p -e \"require('path').dirname(require.resolve('nan'))\")"
      ],
      'xcode_settings': {
        'OTHER_CFLAGS':[
           '<!@(pkg-config protobuf --cflags)'
        ],
        'OTHER_CPLUSPLUSFLAGS':[
           '<!@(pkg-config protobuf --cflags)',
           '-Wshadow'
        ],
        'GCC_ENABLE_CPP_RTTI': 'YES',
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
      },
      'cflags_cc!': ['-fno-rtti', '-fno-exceptions'],
      'cflags_cc' : [
          '<!@(pkg-config protobuf --cflags)'
      ],
      'libraries':[
          '<!@(pkg-config protobuf --libs-only-L)',
          '-lprotobuf-lite'
      ],
      'conditions': [
        ['std == "c++11"', {
            'cflags_cc' : [
                '-std=c++11',
            ],
            'defines': [
               'USE_CXX11'
            ],
            'xcode_settings': {
              'OTHER_CPLUSPLUSFLAGS':['-std=c++11','-stdlib=libc++'],
              'OTHER_LDFLAGS':['-stdlib=libc++'],
              'CLANG_CXX_LANGUAGE_STANDARD':'c++11',
              'MACOSX_DEPLOYMENT_TARGET':'10.7'
            }
        }
        ]
      ]
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': [ 'binding' ],
      'copies': [
          {
            'files': [ '<(PRODUCT_DIR)/binding.node' ],
            'destination': './lib/util/'
          }
      ]
    }
  ]
}
