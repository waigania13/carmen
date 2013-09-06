{
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
            "./src/index.pb.cc"
          ],
          'action': ['protoc','-Iproto/','--cpp_out=./src/','./proto/index.proto']
        }
      ],
    },
    {
      'target_name': 'binding',
      'dependencies': [ 'action_before_build' ],
      'sources': [
        "src/binding.cpp",
        "src/index.pb.cc"
      ],
      "include_dirs" : [
          'src/',
          "<!(node -p -e \"require('path').dirname(require.resolve('nan'))\")"
      ],
      'xcode_settings': {
        'OTHER_CPLUSPLUSFLAGS':['-std=c++11'],
        'GCC_ENABLE_CPP_RTTI': 'YES',
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
      },
      'cflags_cc!': ['-fno-rtti', '-fno-exceptions'],
      'cflags_cc' : [
          '-std=c++11',
          '<!@(pkg-config protobuf --cflags)'
      ],
      'libraries':[
          '<!@(pkg-config protobuf --libs-only-L)',
          '-lprotobuf-lite'
      ],
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': [ 'binding' ],
      'copies': [
          {
            'files': [ '<(PRODUCT_DIR)/binding.node' ],
            'destination': './lib/'
          }
      ]
    }
  ]
}