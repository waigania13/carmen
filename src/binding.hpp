#ifndef __CARMEN_BINDING_HPP__
#define __CARMEN_BINDING_HPP__

// v8
#include <v8.h>

// node
#include <node.h>
#include <node_object_wrap.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wconversion"
#pragma clang diagnostic ignored "-Wshadow"
#pragma clang diagnostic ignored "-Wsign-compare"
#include <nan.h>
#include <exception>
#include <string>
#include <map>
#include <vector>
#include "index.pb.h"
#pragma clang diagnostic pop

namespace binding {

class Cache: public node::ObjectWrap {
    ~Cache();
public:
    typedef uint64_t int_type;
    // lazy ref item
    typedef std::string string_ref_type;
    typedef std::map<int_type,string_ref_type> larraycache;
    typedef larraycache::const_iterator larraycache_iterator;
    typedef std::map<std::string,larraycache> lazycache;
    typedef lazycache::const_iterator lazycache_iterator_type;

    // fully cached item
    typedef std::vector<int_type> intarray;
    typedef std::map<uint32_t,intarray> arraycache;
    typedef arraycache::const_iterator arraycache_iterator;
    typedef std::map<std::string,arraycache> memcache;
    typedef memcache::const_iterator mem_iterator_type;
    static v8::Persistent<v8::FunctionTemplate> constructor;
    static void Initialize(v8::Handle<v8::Object> target);
    static NAN_METHOD(New);
    static NAN_METHOD(has);
    static NAN_METHOD(loadSync);
    static NAN_METHOD(load);
    static void AsyncLoad(uv_work_t* req);
    static void AfterLoad(uv_work_t* req);
    static NAN_METHOD(pack);
    static NAN_METHOD(list);
    static NAN_METHOD(_get);
    static NAN_METHOD(_set);
    static void AsyncRun(uv_work_t* req);
    static void AfterRun(uv_work_t* req);
    Cache(std::string const& id, unsigned shardlevel);
    void _ref() { Ref(); }
    void _unref() { Unref(); }
    std::string id_;
    unsigned shardlevel_;
    memcache cache_;
    lazycache lazy_;
};

}

#endif // __CARMEN_BINDING_HPP__