// v8
#include <v8.h>

// node
#include <node.h>
#include <node_object_wrap.h>
#include <node_version.h>
#include <node_buffer.h>

#include "pbf.hpp"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wconversion"
#pragma clang diagnostic ignored "-Wshadow"
#pragma clang diagnostic ignored "-Wsign-compare"
#include <iostream>
#include <exception>
#include <string>
#include <map>
#include <vector>
#include <nan.h>
#include "index.pb.h"
#pragma clang diagnostic pop

namespace binding {

using namespace v8;

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

class Cache: public node::ObjectWrap {
public:
    static Persistent<FunctionTemplate> constructor;
    static void Initialize(Handle<Object> target);
    static NAN_METHOD(New);
    static NAN_METHOD(has);
    static NAN_METHOD(loadSync);
    static NAN_METHOD(load);
    static void AsyncLoad(uv_work_t* req);
    static void AfterLoad(uv_work_t* req);
    static NAN_METHOD(search);
    static NAN_METHOD(pack);
    static NAN_METHOD(list);
    static NAN_METHOD(set);
    static void AsyncRun(uv_work_t* req);
    static void AfterRun(uv_work_t* req);
    Cache(std::string const& id, unsigned shardlevel);
    void _ref() { Ref(); }
    void _unref() { Unref(); }
    std::string id_;
    unsigned shardlevel_;
    memcache cache_;
    lazycache lazy_;
private:
    ~Cache();
};

Persistent<FunctionTemplate> Cache::constructor;

void Cache::Initialize(Handle<Object> target) {
    NanScope();
    Local<FunctionTemplate> t = FunctionTemplate::New(Cache::New);
    t->InstanceTemplate()->SetInternalFieldCount(1);
    t->SetClassName(String::NewSymbol("Cache"));
    NODE_SET_PROTOTYPE_METHOD(t, "has", has);
    NODE_SET_PROTOTYPE_METHOD(t, "load", load);
    NODE_SET_PROTOTYPE_METHOD(t, "loadSync", loadSync);
    NODE_SET_PROTOTYPE_METHOD(t, "search", search);
    NODE_SET_PROTOTYPE_METHOD(t, "pack", pack);
    NODE_SET_PROTOTYPE_METHOD(t, "list", list);
    NODE_SET_PROTOTYPE_METHOD(t, "_set", set);
    target->Set(String::NewSymbol("Cache"),t->GetFunction());
    NanAssignPersistent(FunctionTemplate, constructor, t);
}

Cache::Cache(std::string const& id, unsigned shardlevel)
  : ObjectWrap(),
    id_(id),
    shardlevel_(shardlevel),
    cache_(),
    lazy_()
    { }

Cache::~Cache() { }

NAN_METHOD(Cache::pack)
{
    NanScope();
    if (args.Length() < 1) {
        return NanThrowTypeError("expected two args: 'type','shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a string");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache const& mem = c->cache_;
        mem_iterator_type itr = mem.find(key);
        carmen::proto::object msg;
        if (itr != mem.end()) {
            arraycache_iterator aitr = itr->second.begin();
            arraycache_iterator aend = itr->second.end();
            while (aitr != aend) {
                ::carmen::proto::object_item * new_item = msg.add_items(); 
                new_item->set_key(aitr->first);
                intarray const & varr = aitr->second;
                std::size_t varr_size = varr.size();
                for (std::size_t i=0;i<varr_size;++i) {
                    new_item->add_val(static_cast<int64_t>(varr[i]));
                }
                ++aitr;
            }
        } else {
            lazycache & lazy = c->lazy_;
            lazycache_iterator_type litr = lazy.begin();
            lazycache_iterator_type lend = lazy.end();
            while (litr != lend) {
                larraycache_iterator laitr = litr->second.begin();
                larraycache_iterator laend = litr->second.end();
                while (laitr != laend) {
                    ::carmen::proto::object_item * new_item = msg.add_items();
                    new_item->set_key(static_cast<int64_t>(laitr->first));
                    string_ref_type const& ref = laitr->second;
                    protobuf::message item(ref.data(), ref.size());
                    while (item.next()) {
                        if (item.tag == 1) {
                            item.skip();
                        } else if (item.tag == 2) {
                            std::size_t arrays_length = static_cast<std::size_t>(item.varint());
                            protobuf::message pbfarray(item.data,arrays_length);
                            while (pbfarray.next()) {
                                new_item->add_val(static_cast<int64_t>(pbfarray.value));
                            }
                            item.skipBytes(arrays_length);
                        } else {
                            throw std::runtime_error("hit unknown type");
                        }
                    }
                    ++laitr;
                }
                ++litr;
            }
        }
        int size = msg.ByteSize();
        if (size > 0)
        {
            std::size_t usize = static_cast<std::size_t>(size);
            #if NODE_VERSION_AT_LEAST(0, 11, 0)
            Local<Object> retbuf = node::Buffer::New(usize);
            if (msg.SerializeToArray(node::Buffer::Data(retbuf),size))
            {
                NanReturnValue(retbuf);
            }
            #else
            node::Buffer *retbuf = node::Buffer::New(usize);
            if (msg.SerializeToArray(node::Buffer::Data(retbuf),size))
            {
                NanReturnValue(retbuf->handle_);
            }
            #endif
        } else {
            return NanThrowTypeError("message ByteSize was negative");
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Undefined());
}

NAN_METHOD(Cache::list)
{
    NanScope();
    if (args.Length() < 1) {
        return NanThrowTypeError("expected at least one arg: 'type' + optional 'shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a string");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache & mem = c->cache_;
        Local<Array> ids = Array::New();
        if (args.Length() == 1) {
            mem_iterator_type itr = mem.begin();
            mem_iterator_type end = mem.end();
            unsigned idx = 0;
            while (itr != end) {
                if (itr->first.size() > type.size() && itr->first.substr(0,type.size()) == type) {
                    std::string shard = itr->first.substr(type.size()+1,itr->first.size());
                    ids->Set(idx++,Number::New(String::New(shard.c_str())->NumberValue()));
                }
                ++itr;
            }
            lazycache & lazy = c->lazy_;
            lazycache_iterator_type litr = lazy.begin();
            lazycache_iterator_type lend = lazy.end();
            while (litr != lend) {
                if (litr->first.size() > type.size() && litr->first.substr(0,type.size()) == type) {
                    std::string shard = litr->first.substr(type.size()+1,litr->first.size());
                    ids->Set(idx++,Number::New(String::New(shard.c_str())->NumberValue()));
                }
                ++litr;
            }
            NanReturnValue(ids);
        } else if (args.Length() == 2) {
            std::string shard = *String::Utf8Value(args[1]->ToString());
            std::string key = type + "-" + shard;
            mem_iterator_type itr = mem.find(key);
            unsigned idx = 0;
            if (itr != mem.end()) {
                arraycache_iterator aitr = itr->second.begin();
                arraycache_iterator aend = itr->second.end();
                while (aitr != aend) {
                    ids->Set(idx++,Number::New(aitr->first)->ToString());
                    ++aitr;
                }
            }
            lazycache & lazy = c->lazy_;
            lazycache_iterator_type litr = lazy.find(key);
            if (litr != lazy.end()) {
                larraycache_iterator laitr = litr->second.begin();
                larraycache_iterator laend = litr->second.end();
                while (laitr != laend) {
                    ids->Set(idx++,Number::New(laitr->first)->ToString());
                    ++laitr;
                }
            }
            NanReturnValue(ids);
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Undefined());
}

NAN_METHOD(Cache::set)
{
    NanScope();
    if (args.Length() < 3) {
        return NanThrowTypeError("expected three args: 'type','shard','id','data'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a string");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an integer");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg must be an integer");
    }
    if (!args[3]->IsArray()) {
        return NanThrowTypeError("fourth arg must be an array");
    }
    Local<Array> data = Local<Array>::Cast(args[3]);
    if (data->IsNull() || data->IsUndefined()) {
        return NanThrowTypeError("an array expected for third argument");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache & mem = c->cache_;
        mem_iterator_type itr = mem.find(key);
        if (itr == mem.end()) {
            c->cache_.insert(std::make_pair(key,arraycache()));
        }
        arraycache & arrc = c->cache_[key];
        arraycache::key_type key_id = static_cast<arraycache::key_type>(args[2]->IntegerValue());
        arraycache_iterator itr2 = arrc.find(key_id);
        if (itr2 == arrc.end()) {
            arrc.insert(std::make_pair(key_id,intarray()));   
        }
        intarray & vv = arrc[key_id];
        if (itr2 != arrc.end()) {
            vv.clear();
        }
        unsigned array_size = data->Length();
        vv.reserve(array_size);
        for (unsigned i=0;i<array_size;++i) {
            #ifdef USE_CXX11
            vv.emplace_back(data->Get(i)->NumberValue());
            #else
            vv.push_back(data->Get(i)->NumberValue());
            #endif
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Undefined());
}

void load_into_cache(larraycache & larrc,
                            std::string const& key,
                            const char * data,
                            size_t size) {
    protobuf::message message(data,size);
    while (message.next()) {
        if (message.tag == 1) {
            uint64_t bytes = message.varint();
            protobuf::message item(message.data, bytes);
            while (item.next()) {
                if (item.tag == 1) {
                    int_type key_id = item.varint();
                    // NOTE: emplace is faster with libcxx if using std::string
                    // if using boost::string_ref, std::move is faster
                    #ifdef USE_CXX11
                    larrc.insert(std::make_pair(key_id,std::move(string_ref_type((const char *)message.data,bytes))));
                    #else
                    larrc.insert(std::make_pair(key_id,string_ref_type((const char *)message.data,bytes)));
                    #endif
                } else {
                    break;
                }
            }
            message.skipBytes(bytes);
        } else {
            throw std::runtime_error("a skipping when shouldnt");
            message.skip();
        }
    }
}

NAN_METHOD(Cache::loadSync)
{
    NanScope();
    if (args.Length() < 2) {
        return NanThrowTypeError("expected at least three args: 'buffer','type','shard', and optionally an options arg and callback");
    }
    if (!args[0]->IsObject()) {
        return NanThrowTypeError("first argument must be a buffer");
    }
    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        return NanThrowTypeError("a buffer expected for first argument");
    }
    if (!node::Buffer::HasInstance(obj)) {
        return NanThrowTypeError("first argument must be a buffer");
    }
    if (!args[1]->IsString()) {
        return NanThrowTypeError("second arg 'type' must be a string");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg 'shard' must be an Integer");
    }
    if (args.Length() > 3) {
        if (!args[3]->IsObject()) {
            return ThrowException(Exception::TypeError(
                                      String::New("optional second arg must be an options object")));
        }
        // TODO - handle options in the future
        //Local<Object> options = args[3]->ToObject();
    }
    try {
        std::string type = *String::Utf8Value(args[1]->ToString());
        std::string shard = *String::Utf8Value(args[2]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache & mem = c->cache_;
        mem_iterator_type itr = mem.find(key);
        if (itr != mem.end()) {
            c->cache_.insert(std::make_pair(key,arraycache()));
        }
        memcache::iterator itr2 = mem.find(key);
        if (itr2 != mem.end()) {
            mem.erase(itr2);
        }
        lazycache & lazy = c->lazy_;
        lazycache_iterator_type litr = lazy.find(key);
        if (litr == lazy.end()) {
            c->lazy_.insert(std::make_pair(key,larraycache()));
        }
        load_into_cache(c->lazy_[key],key,node::Buffer::Data(obj),node::Buffer::Length(obj));
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Undefined());
}

struct load_baton {
    uv_work_t request;
    Cache * c;
    larraycache arrc;
    Persistent<Function> cb;
    std::string key;
    std::string data;
    bool error;
    std::string error_name;
    load_baton(std::string const& _key,
               const char * _data,
               size_t size) :
      key(_key),
      data(_data,size),
      error(false),
      error_name() {}
};

void Cache::AsyncLoad(uv_work_t* req) {
    load_baton *closure = static_cast<load_baton *>(req->data);
    try {
        load_into_cache(closure->arrc,closure->key,closure->data.data(),closure->data.size());
    }
    catch (std::exception const& ex)
    {
        closure->error = true;
        closure->error_name = ex.what();
    }
}

void Cache::AfterLoad(uv_work_t* req) {
    NanScope();
    load_baton *closure = static_cast<load_baton *>(req->data);
    TryCatch try_catch;
    if (closure->error) {
        Local<Value> argv[1] = { Exception::Error(String::New(closure->error_name.c_str())) };
        closure->cb->Call(Context::GetCurrent()->Global(), 1, argv);
    } else {
        memcache::iterator itr2 = closure->c->cache_.find(closure->key);
        if (itr2 != closure->c->cache_.end()) {
            closure->c->cache_.erase(itr2);
        }
        #ifdef USE_CXX11
        closure->c->lazy_[closure->key] = std::move(closure->arrc);
        #else
        closure->c->lazy_[closure->key] = closure->arrc;
        #endif
        Local<Value> argv[1] = { Local<Value>::New(Null()) };
        closure->cb->Call(Context::GetCurrent()->Global(), 1, argv);
    }
    if (try_catch.HasCaught())
    {
        node::FatalException(try_catch);
    }
    closure->c->_unref();
    closure->cb.Dispose();
    delete closure;
}

NAN_METHOD(Cache::load)
{
    NanScope();
    Local<Value> callback = args[args.Length()-1];
    if (!args[args.Length()-1]->IsFunction()) {
        return loadSync(args);
    }
    if (args.Length() < 2) {
        return NanThrowTypeError("expected at least three args: 'buffer','type','shard', and optionally an options arg and callback");
    }
    if (!args[0]->IsObject()) {
        return NanThrowTypeError("first argument must be a buffer");
    }
    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        return NanThrowTypeError("a buffer expected for first argument");
    }
    if (!node::Buffer::HasInstance(obj)) {
        return NanThrowTypeError("first argument must be a buffer");
    }
    if (!args[1]->IsString()) {
        return NanThrowTypeError("second arg 'type' must be a string");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg 'shard' must be an Integer");
    }
    if (args.Length() > 3) {
        if (!args[3]->IsObject()) {
            return ThrowException(Exception::TypeError(
                                      String::New("optional second arg must be an options object")));
        }
        // TODO - handle options in the future
        //Local<Object> options = args[3]->ToObject();
    }

    try {
        std::string type = *String::Utf8Value(args[1]->ToString());
        std::string shard = *String::Utf8Value(args[2]->ToString());
        std::string key = type + "-" + shard;
        load_baton *closure = new load_baton(key,node::Buffer::Data(obj),node::Buffer::Length(obj));
        closure->request.data = closure;
        closure->c = node::ObjectWrap::Unwrap<Cache>(args.This());
        closure->cb = Persistent<Function>::New(Handle<Function>::Cast(callback));
        uv_queue_work(uv_default_loop(), &closure->request, AsyncLoad, (uv_after_work_cb)AfterLoad);
        closure->c->_ref();
        return Undefined();
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
}


NAN_METHOD(Cache::has)
{
    NanScope();
    if (args.Length() < 2) {
        return NanThrowTypeError("expected two args: type and shard");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first arg must be a string");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache const& mem = c->cache_;
        mem_iterator_type itr = mem.find(key);
        if (itr != mem.end()) {
            NanReturnValue(True());
        } else {
            lazycache const& lazy = c->lazy_;
            lazycache_iterator_type litr = lazy.find(key);
            if (litr != lazy.end()) {
                NanReturnValue(True());
            }
            NanReturnValue(False());
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
}

NAN_METHOD(Cache::search)
{
    NanScope();
    if (args.Length() < 3) {
        return NanThrowTypeError("expected two args: type, shard, and id");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first arg must be a string");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an integer");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg must be an integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        int_type id = static_cast<int_type>(args[2]->IntegerValue());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        memcache & mem = c->cache_;
        mem_iterator_type itr = mem.find(key);
        if (itr == mem.end()) {
            lazycache const& lazy = c->lazy_;
            lazycache_iterator_type litr = lazy.find(key);
            if (litr == lazy.end()) {
                NanReturnValue(Undefined());
            }
            larraycache_iterator laitr = litr->second.find(id);
            if (laitr == litr->second.end()) {
                NanReturnValue(Undefined());
            } else {
                intarray array; // TODO - reserve
                string_ref_type const& ref = laitr->second;
                protobuf::message item(ref.data(), ref.size());
                while (item.next()) {
                    if (item.tag == 1) {
                        item.skip();
                    } else if (item.tag == 2) {
                        uint64_t arrays_length = item.varint();
                        protobuf::message pbfarray(item.data,arrays_length);
                        while (pbfarray.next()) {
                            #ifdef USE_CXX11
                            array.emplace_back(pbfarray.value);
                            #else
                            array.push_back(pbfarray.value);
                            #endif
                        }
                        item.skipBytes(arrays_length);
                    } else {
                        throw std::runtime_error("hit unknown type");
                    }
                }
                std::size_t vals_size = array.size();
                Local<Array> arr_obj = Array::New(static_cast<int>(vals_size));
                for (unsigned k=0;k<vals_size;++k) {
                    arr_obj->Set(k,Number::New(array[k]));
                }
                NanReturnValue(arr_obj);
            }
        } else {
            arraycache_iterator aitr = itr->second.find(id);
            if (aitr == itr->second.end()) {
                NanReturnValue(Undefined());
            } else {
                intarray const& array = aitr->second;
                unsigned vals_size = array.size();
                Local<Array> arr_obj = Array::New(static_cast<int>(vals_size));
                for (unsigned k=0;k<vals_size;++k) {
                    arr_obj->Set(k,Number::New(array[k]));
                }
                NanReturnValue(arr_obj);
            }
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
}

NAN_METHOD(Cache::New)
{
    NanScope();
    if (!args.IsConstructCall()) {
        return NanThrowTypeError("Cannot call constructor as function, you need to use 'new' keyword");
    }
    try {
        if (args.Length() < 2) {
            return NanThrowTypeError("expected 'id' and 'shardlevel' arguments");
        }
        if (!args[0]->IsString()) {
            return NanThrowTypeError("first argument 'id' must be a string");
        }
        if (!args[1]->IsNumber()) {
            return NanThrowTypeError("first argument 'shardlevel' must be a number");
        }
        std::string id = *String::Utf8Value(args[0]->ToString());
        unsigned shardlevel = static_cast<unsigned>(args[1]->IntegerValue());
        Cache* im = new Cache(id,shardlevel);
        im->Wrap(args.This());
        args.This()->Set(String::NewSymbol("id"),args[0]);
        args.This()->Set(String::NewSymbol("shardlevel"),args[1]);
        NanReturnValue(args.This());
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Undefined());
}

extern "C" {
    static void start(Handle<Object> target) {
        Cache::Initialize(target);
    }
}

} // namespace binding

NODE_MODULE(binding, binding::start)
