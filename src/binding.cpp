
#include "binding.hpp"
#include <node_version.h>
#include <node_buffer.h>

#include "pbf.hpp"

#include <sstream>

namespace binding {

using namespace v8;

Persistent<FunctionTemplate> Cache::constructor;

void Cache::Initialize(Handle<Object> target) {
    NanScope();
    Local<FunctionTemplate> t = FunctionTemplate::New(Cache::New);
    t->InstanceTemplate()->SetInternalFieldCount(1);
    t->SetClassName(String::NewSymbol("Cache"));
    NODE_SET_PROTOTYPE_METHOD(t, "has", has);
    NODE_SET_PROTOTYPE_METHOD(t, "load", load);
    NODE_SET_PROTOTYPE_METHOD(t, "loadSync", loadSync);
    NODE_SET_PROTOTYPE_METHOD(t, "pack", pack);
    NODE_SET_PROTOTYPE_METHOD(t, "list", list);
    NODE_SET_PROTOTYPE_METHOD(t, "_set", _set);
    NODE_SET_PROTOTYPE_METHOD(t, "_get", _get);
    NODE_SET_PROTOTYPE_METHOD(t, "unload", unload);
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
        return NanThrowTypeError("expected two args: 'type', 'shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a String");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an Integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache const& mem = c->cache_;
        Cache::mem_iterator_type itr = mem.find(key);
        carmen::proto::object message;
        if (itr != mem.end()) {
            Cache::arraycache_iterator aitr = itr->second.begin();
            Cache::arraycache_iterator aend = itr->second.end();
            while (aitr != aend) {
                ::carmen::proto::object_item * new_item = message.add_items(); 
                new_item->set_key(aitr->first);
                Cache::intarray const & varr = aitr->second;
                std::size_t varr_size = varr.size();
                for (std::size_t i=0;i<varr_size;++i) {
                    new_item->add_val(static_cast<int64_t>(varr[i]));
                }
                ++aitr;
            }
        } else {
            Cache::lazycache const& lazy = c->lazy_;
            Cache::lazycache_iterator_type litr = lazy.find(key);
            if (litr != lazy.end()) {
                Cache::larraycache_iterator laitr = litr->second.begin();
                Cache::larraycache_iterator laend = litr->second.end();
                while (laitr != laend) {
                    ::carmen::proto::object_item * new_item = message.add_items();
                    new_item->set_key(static_cast<int64_t>(laitr->first));
                    Cache::string_ref_type const& ref = laitr->second;
                    protobuf::message item(ref.data(), ref.size());
                    while (item.next()) {
                        if (item.tag == 1) {
                            item.skip();
                        } else if (item.tag == 2) {
                            uint64_t len = item.varint();
                            protobuf::message pbfarray(item.getData(),static_cast<std::size_t>(len));
                            while (pbfarray.next()) {
                                new_item->add_val(static_cast<int64_t>(pbfarray.value));
                            }
                            item.skipBytes(len);
                        } else {
                            std::stringstream msg("");
                            msg << "pack: hit unknown protobuf type: '" << item.tag << "'";
                            throw std::runtime_error(msg.str());
                        }
                    }
                    ++laitr;
                }
            } else {
                return NanThrowTypeError("pack: cannot pack empty data");
            }
        }
        int size = message.ByteSize();
        if (size > 0)
        {
            std::size_t usize = static_cast<std::size_t>(size);
#if NODE_VERSION_AT_LEAST(0, 11, 0)
            Local<Object> retbuf = node::Buffer::New(usize);
            if (message.SerializeToArray(node::Buffer::Data(retbuf),size))
            {
                NanReturnValue(retbuf);
            }
#else
            node::Buffer *retbuf = node::Buffer::New(usize);
            if (message.SerializeToArray(node::Buffer::Data(retbuf),size))
            {
                NanReturnValue(retbuf->handle_);
            }
#endif
        } else {
            return NanThrowTypeError("pack: invalid message ByteSize encountered");
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
        return NanThrowTypeError("expected at least one arg: 'type' and optional a 'shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a String");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache const& mem = c->cache_;
        Local<Array> ids = Array::New();
        if (args.Length() == 1) {
            Cache::mem_iterator_type itr = mem.begin();
            Cache::mem_iterator_type end = mem.end();
            unsigned idx = 0;
            while (itr != end) {
                if (itr->first.size() > type.size() && itr->first.substr(0,type.size()) == type) {
                    std::string shard = itr->first.substr(type.size()+1,itr->first.size());
                    ids->Set(idx++,Number::New(String::New(shard.c_str())->NumberValue()));
                }
                ++itr;
            }
            Cache::lazycache const& lazy = c->lazy_;
            Cache::lazycache_iterator_type litr = lazy.begin();
            Cache::lazycache_iterator_type lend = lazy.end();
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
            Cache::mem_iterator_type itr = mem.find(key);
            unsigned idx = 0;
            if (itr != mem.end()) {
                Cache::arraycache_iterator aitr = itr->second.begin();
                Cache::arraycache_iterator aend = itr->second.end();
                while (aitr != aend) {
                    ids->Set(idx++,Number::New(aitr->first)->ToString());
                    ++aitr;
                }
            }
            Cache::lazycache const& lazy = c->lazy_;
            Cache::lazycache_iterator_type litr = lazy.find(key);
            if (litr != lazy.end()) {
                Cache::larraycache_iterator laitr = litr->second.begin();
                Cache::larraycache_iterator laend = litr->second.end();
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

NAN_METHOD(Cache::_set)
{
    NanScope();
    if (args.Length() < 3) {
        return NanThrowTypeError("expected four args: 'type', 'shard', 'id', 'data'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first argument must be a String");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an Integer");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg must be an Integer");
    }
    if (!args[3]->IsArray()) {
        return NanThrowTypeError("fourth arg must be an Array");
    }
    Local<Array> data = Local<Array>::Cast(args[3]);
    if (data->IsNull() || data->IsUndefined()) {
        return NanThrowTypeError("an array expected for fourth argument");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache & mem = c->cache_;
        Cache::mem_iterator_type itr = mem.find(key);
        if (itr == mem.end()) {
            c->cache_.insert(std::make_pair(key,Cache::arraycache()));
        }
        Cache::arraycache & arrc = c->cache_[key];
        Cache::arraycache::key_type key_id = static_cast<Cache::arraycache::key_type>(args[2]->IntegerValue());
        Cache::arraycache_iterator itr2 = arrc.find(key_id);
        if (itr2 == arrc.end()) {
            arrc.insert(std::make_pair(key_id,Cache::intarray()));
        }
        Cache::intarray & vv = arrc[key_id];
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

void load_into_cache(Cache::larraycache & larrc,
                            std::string const& key,
                            const char * data,
                            size_t size) {
    protobuf::message message(data,size);
    while (message.next()) {
        if (message.tag == 1) {
            uint64_t len = message.varint();
            protobuf::message item(message.getData(), static_cast<std::size_t>(len));
            while (item.next()) {
                if (item.tag == 1) {
                    uint64_t key_id = item.varint();
                    // NOTE: emplace is faster with libcxx if using std::string
                    // if using boost::string_ref, std::move is faster
#ifdef USE_CXX11
                    larrc.insert(std::make_pair(key_id,std::move(Cache::string_ref_type(message.getData(),len))));
#else
                    larrc.insert(std::make_pair(key_id,Cache::string_ref_type(message.getData(),len)));
#endif
                }
                // it is safe to break immediately because tag 1 should come first
                break;
            }
            message.skipBytes(len);
        } else {
            std::stringstream msg("");
            msg << "load: hit unknown protobuf type: '" << message.tag << "'";
            throw std::runtime_error(msg.str());
        }
    }
}

NAN_METHOD(Cache::loadSync)
{
    NanScope();
    if (args.Length() < 2) {
        return NanThrowTypeError("expected at three args: 'buffer', 'type', and 'shard'");
    }
    if (!args[0]->IsObject()) {
        return NanThrowTypeError("first argument must be a Buffer");
    }
    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        return NanThrowTypeError("a buffer expected for first argument");
    }
    if (!node::Buffer::HasInstance(obj)) {
        return NanThrowTypeError("first argument must be a Buffer");
    }
    if (!args[1]->IsString()) {
        return NanThrowTypeError("second arg 'type' must be a String");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg 'shard' must be an Integer");
    }
    try {
        std::string type = *String::Utf8Value(args[1]->ToString());
        std::string shard = *String::Utf8Value(args[2]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache & mem = c->cache_;
        Cache::mem_iterator_type itr = mem.find(key);
        if (itr != mem.end()) {
            c->cache_.insert(std::make_pair(key,arraycache()));
        }
        Cache::memcache::iterator itr2 = mem.find(key);
        if (itr2 != mem.end()) {
            mem.erase(itr2);
        }
        Cache::lazycache & lazy = c->lazy_;
        Cache::lazycache_iterator_type litr = lazy.find(key);
        if (litr == lazy.end()) {
            c->lazy_.insert(std::make_pair(key,Cache::larraycache()));
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
    Persistent<Function> cb;
    Cache::larraycache arrc;
    std::string key;
    std::string data;
    bool error;
    std::string error_name;
    load_baton(std::string const& _key,
               const char * _data,
               size_t size) :
      arrc(),
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
        Cache::memcache::iterator itr2 = closure->c->cache_.find(closure->key);
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
        return NanThrowTypeError("expected at least three args: 'buffer', 'type', 'shard', and optionally a 'callback'");
    }
    if (!args[0]->IsObject()) {
        return NanThrowTypeError("first argument must be a Buffer");
    }
    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        return NanThrowTypeError("a buffer expected for first argument");
    }
    if (!node::Buffer::HasInstance(obj)) {
        return NanThrowTypeError("first argument must be a Buffer");
    }
    if (!args[1]->IsString()) {
        return NanThrowTypeError("second arg 'type' must be a String");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg 'shard' must be an Integer");
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
        return NanThrowTypeError("expected two args: 'type' and 'shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first arg must be a String");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an Integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache const& mem = c->cache_;
        Cache::mem_iterator_type itr = mem.find(key);
        if (itr != mem.end()) {
            NanReturnValue(True());
        } else {
            Cache::lazycache const& lazy = c->lazy_;
            Cache::lazycache_iterator_type litr = lazy.find(key);
            if (litr != lazy.end()) {
                NanReturnValue(True());
            }
            NanReturnValue(False());
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
}

NAN_METHOD(Cache::_get)
{
    NanScope();
    if (args.Length() < 3) {
        return NanThrowTypeError("expected three args: type, shard, and id");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first arg must be a String");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an Integer");
    }
    if (!args[2]->IsNumber()) {
        return NanThrowTypeError("third arg must be an Integer");
    }
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        uint64_t id = static_cast<uint64_t>(args[2]->IntegerValue());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache const& mem = c->cache_;
        Cache::mem_iterator_type itr = mem.find(key);
        if (itr == mem.end()) {
            Cache::lazycache const& lazy = c->lazy_;
            Cache::lazycache_iterator_type litr = lazy.find(key);
            if (litr == lazy.end()) {
                NanReturnValue(Undefined());
            }
            Cache::larraycache_iterator laitr = litr->second.find(id);
            if (laitr == litr->second.end()) {
                NanReturnValue(Undefined());
            } else {
                // NOTE: we cannot call array.reserve here since
                // the total length is not known
                Cache::intarray array;
                Cache::string_ref_type const& ref = laitr->second;
                protobuf::message item(ref.data(), ref.size());
                while (item.next()) {
                    if (item.tag == 1) {
                        item.skip();
                    } else if (item.tag == 2) {
                        uint64_t len = item.varint();
                        protobuf::message pbfarray(item.getData(),static_cast<std::size_t>(len));
                        while (pbfarray.next()) {
#ifdef USE_CXX11
                            array.emplace_back(pbfarray.value);
#else
                            array.push_back(pbfarray.value);
#endif
                        }
                        item.skipBytes(len);
                    } else {
                        std::stringstream msg("");
                        msg << "cxx get: hit unknown protobuf type: '" << item.tag << "'";
                        throw std::runtime_error(msg.str());
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
            Cache::arraycache_iterator aitr = itr->second.find(id);
            if (aitr == itr->second.end()) {
                NanReturnValue(Undefined());
            } else {
                Cache::intarray const& array = aitr->second;
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

NAN_METHOD(Cache::unload)
{
    NanScope();
    if (args.Length() < 2) {
        return NanThrowTypeError("expected at least two args: 'type' and 'shard'");
    }
    if (!args[0]->IsString()) {
        return NanThrowTypeError("first arg must be a String");
    }
    if (!args[1]->IsNumber()) {
        return NanThrowTypeError("second arg must be an Integer");
    }
    bool hit = false;
    try {
        std::string type = *String::Utf8Value(args[0]->ToString());
        std::string shard = *String::Utf8Value(args[1]->ToString());
        std::string key = type + "-" + shard;
        Cache* c = node::ObjectWrap::Unwrap<Cache>(args.This());
        Cache::memcache & mem = c->cache_;
        Cache::memcache::iterator itr = mem.find(key);
        if (itr != mem.end()) {
            hit = true;
            mem.erase(itr);
        }
        Cache::lazycache & lazy = c->lazy_;
        Cache::lazycache::iterator litr = lazy.find(key);
        if (litr != lazy.end()) {
            hit = true;
            lazy.erase(litr);
        }
    } catch (std::exception const& ex) {
        return NanThrowTypeError(ex.what());
    }
    NanReturnValue(Boolean::New(hit));
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
            return NanThrowTypeError("first argument 'id' must be a String");
        }
        if (!args[1]->IsNumber()) {
            return NanThrowTypeError("second argument 'shardlevel' must be a number");
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
