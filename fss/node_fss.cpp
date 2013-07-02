// v8
#include <v8.h>

// node
#include <node.h>
#include <node_version.h>
#include <node_object_wrap.h>

// stl
#include <iostream>
#include <fstream>
#include <algorithm>
// boost
#include <boost/spirit/include/qi.hpp>
#include <boost/locale.hpp>
#include <boost/regex/pending/unicode_iterator.hpp>
#include <boost/make_shared.hpp>

// geocoder
#include "geocoder/fss.hpp"

namespace node_fss {

using namespace v8;

// interfaces

typedef geocoder::fss_engine<> geocoder;
typedef boost::shared_ptr<geocoder> fss_ptr;

class Engine: public node::ObjectWrap {
public:
    static Persistent<FunctionTemplate> constructor;
    static void Initialize(Handle<Object> target);
    static Handle<Value> New(Arguments const& args);
    static Handle<Value> addSync(Arguments const& args);
    static Handle<Value> add(Arguments const& args);
    static void AsyncAdd(uv_work_t* req);
    static void AfterAdd(uv_work_t* req);
    static Handle<Value> search(Arguments const& args);
    Engine();
    inline fss_ptr get() { return this_; }
    void _ref() { Ref(); }
    void _unref() { Unref(); }
private:
    ~Engine();
    fss_ptr this_;
};


// implementations

Persistent<FunctionTemplate> Engine::constructor;

void Engine::Initialize(Handle<Object> target) {
    HandleScope scope;
    constructor = Persistent<FunctionTemplate>::New(FunctionTemplate::New(Engine::New));
    constructor->InstanceTemplate()->SetInternalFieldCount(1);
    constructor->SetClassName(String::NewSymbol("Engine"));
    NODE_SET_PROTOTYPE_METHOD(constructor, "add", add);
    NODE_SET_PROTOTYPE_METHOD(constructor, "addSync", add);
    NODE_SET_PROTOTYPE_METHOD(constructor, "search", search);
    target->Set(String::NewSymbol("Engine"),constructor->GetFunction());
}

Engine::Engine()
  : ObjectWrap(),
    this_(boost::make_shared<geocoder>()) { }

Engine::~Engine() { }

Handle<Value> Engine::New(Arguments const& args)
{
    HandleScope scope;
    if (!args.IsConstructCall()) {
        return ThrowException(String::New("Cannot call constructor as function, you need to use 'new' keyword"));
    }
    try {
        Engine* im = new Engine();
        im->Wrap(args.This());
        return args.This();
    } catch (std::exception const& ex) {
        return ThrowException(String::New(ex.what()));
    }
    return Undefined();
}

Handle<Value> Engine::addSync(Arguments const& args)
{
    HandleScope scope;

    if (args.Length() < 1) {
        ThrowException(String::New("first argument must be an object"));
    }

    if (!args[0]->IsObject()) {
        return ThrowException(String::New("first argument must be an object"));
    }

    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        return ThrowException(Exception::TypeError(String::New("valid object expected for first argument")));
    }
    if (!obj->Has(String::NewSymbol("file")) || !obj->Has(String::NewSymbol("distance"))) {
        return ThrowException(String::New("must provide a file path and distance in object argument"));
    }
    Local<Value> file_obj = obj->Get(String::New("file"));
    if (!file_obj->IsString()) {
        return ThrowException(String::New("file must be a string"));
    }
    std::string filename = *String::Utf8Value(file_obj->ToString());

    Local<Value> distance_obj = obj->Get(String::New("distance"));
    if (!distance_obj->IsNumber()) {
        return ThrowException(String::New("distance must be a number"));
    }
    int distance = distance_obj->IntegerValue();

    Engine* machine = ObjectWrap::Unwrap<Engine>(args.This());

    fss_ptr dict = machine->get();

    std::ifstream file(filename);
    if (!file)
    {
        return ThrowException(String::New("Can't open dictinary file"));
    }

    boost::locale::generator gen;
    std::locale loc = gen("");
    std::locale::global(loc);
    std::cerr.imbue(loc);

    std::string line;
    std::set<std::u32string> temp_dict;
    uint64_t count = 0;
    while (std::getline(file, line))
    {
        ++count;
        if (count%1000 == 0)
        {
            std::cerr << "\rLoading " << count;
        }

        // normalize
        line = boost::locale::to_lower(line);
        boost::u8_to_u32_iterator<std::string::const_iterator> begin(line.begin());
        boost::u8_to_u32_iterator<std::string::const_iterator> end(line.end());

        std::vector<std::u32string> words;
        // extract tokens
        bool result = boost::spirit::qi::parse(begin, end,
                                               +(boost::spirit::standard_wide::char_ - (boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")))
                                               % +(boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")),
                                               temp_dict);

        if (!result)
        {
            std::cerr << "Failed parsing tokens:" << line << std::endl;
            //ThrowException(String::New("Failed parsing tokens"));
        }
    }

    count = 0;

    for (auto && word : temp_dict)
    {
        ++count;
        if (count%1000 == 0)
        {
            std::cerr << "\rCreating index " << count << "/" << temp_dict.size() << " " << int(100*(count/(float)temp_dict.size())) << "%";
        }
        boost::u32_to_u8_iterator<std::u32string::const_iterator> begin(word.begin());
        boost::u32_to_u8_iterator<std::u32string::const_iterator> end(word.end());
        dict->add(std::string(begin,end));
    }
    std::cerr << std::endl;
    temp_dict.clear();

    return scope.Close(String::New("TODO"));
}

typedef struct {
    uv_work_t request;
    Engine * machine;
    std::string query;
    bool error;
    std::string result;
    Persistent<Function> cb;
} add_baton_t;

Handle<Value> Engine::add(Arguments const& args)
{
    HandleScope scope;

    return addSync(args);
    if (args.Length() == 1) {
        return addSync(args);
    }

    /*if (args.Length() < 1) {
        ThrowException(String::New("first argument must be an object"));
    }

    if (!args[0]->IsObject()) {
        return ThrowException(String::New("first argument must be an object"));
    }

    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined()) {
        ThrowException(Exception::TypeError(String::New("an object expected for first argument")));
    }

    // ensure callback is a function
    Local<Value> callback = args[args.Length()-1];
    if (!args[args.Length()-1]->IsFunction()) {
        return ThrowException(Exception::TypeError(
                                  String::New("last argument must be a callback function")));
    }

    Engine * machine = ObjectWrap::Unwrap<Engine>(args.This());
    add_baton_t *closure = new add_baton_t();
    closure->request.data = closure;
    closure->machine = machine;
    closure->query = query;
    closure->error = false;
    closure->cb = Persistent<Function>::New(Handle<Function>::Cast(callback));
    uv_queue_work(uv_default_loop(), &closure->request, AsyncAdd, (uv_after_work_cb)AfterAdd);
    closure->machine->_ref();
    closure->query->_ref();
    */
    return Undefined();
}

/*
void Engine::AsyncRun(uv_work_t* req) {
    add_baton_t *closure = static_cast<add_baton_t *>(req->data);
    try {
        http::Reply osrm_reply;
        closure->machine->this_->RunQuery(*(closure->query->get()), osrm_reply);
        closure->result = osrm_reply.content;
    } catch(std::exception const& ex) {
        closure->error = true;
        closure->result = ex.what();
    }
}

void Engine::AfterRun(uv_work_t* req) {
    HandleScope scope;
    add_baton_t *closure = static_cast<add_baton_t *>(req->data);
    TryCatch try_catch;
    if (closure->error) {
        Local<Value> argv[1] = { Exception::Error(String::New(closure->result.c_str())) };
        closure->cb->Call(Context::GetCurrent()->Global(), 1, argv);
    } else {
        Local<Value> argv[2] = { Local<Value>::New(Null()),
                                 String::New(closure->result.c_str()) };
        closure->cb->Call(Context::GetCurrent()->Global(), 2, argv);
    }
    if (try_catch.HasCaught()) {
        node::FatalException(try_catch);
    }
    closure->machine->_unref();
    closure->query->_unref();
    closure->cb.Dispose();
    delete closure;
}
*/

Handle<Value> Engine::search(Arguments const& args)
{
    HandleScope scope;
    if (args.Length() < 1)
    {
        ThrowException(String::New("first argument must be an object"));
    }

    if (!args[0]->IsObject())
    {
        return ThrowException(String::New("first argument must be an object"));
    }

    Local<Object> obj = args[0]->ToObject();
    if (obj->IsNull() || obj->IsUndefined())
    {
        return ThrowException(Exception::TypeError(String::New("valid object expected for first argument")));
    }

    if (!obj->Has(String::NewSymbol("query")) || !obj->Has(String::NewSymbol("distance")) ||  !obj->Has(String::NewSymbol("num_results")))
    {
        return ThrowException(String::New("must provide a query string and distance in object argument"));
    }

    // dict file-name
    Local<Value> file_obj = obj->Get(String::New("query"));
    if (!file_obj->IsString())
    {
        return ThrowException(String::New("query must be an UTF8 encoded string"));
    }
    std::string query = *String::Utf8Value(file_obj->ToString());

    // distance
    Local<Value> distance_obj = obj->Get(String::New("distance"));
    if (!distance_obj->IsNumber())
    {
        return ThrowException(String::New("distance must be an integer"));
    }
    int distance = distance_obj->IntegerValue();

    // num_results
    Local<Value> num_results_obj = obj->Get(String::New("num_results"));
    if (!num_results_obj->IsNumber())
    {
        return ThrowException(String::New("num_results must be an integer"));
    }
    int num_results = num_results_obj->IntegerValue();

    Engine* machine = ObjectWrap::Unwrap<Engine>(args.This());

    fss_ptr dict = machine->get();

    query = boost::locale::to_lower(query);

    boost::u8_to_u32_iterator<std::string::const_iterator> begin(query.begin());
    boost::u8_to_u32_iterator<std::string::const_iterator> end(query.end());
    std::vector<std::u32string> tokens;
    // extract tokens
    bool result = boost::spirit::qi::parse(begin, end,
                                           +(boost::spirit::standard_wide::char_ - (boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")))
                                           % +(boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")),
                                           tokens);

    if (!result)
    {
        ThrowException(String::New("FAIL parsing query tokens"));
    }

    Local<Array> results = Array::New();

    unsigned index = 0;
    for (auto token : tokens)
    {

        boost::u32_to_u8_iterator<std::u32string::const_iterator> begin(token.begin());
        boost::u32_to_u8_iterator<std::u32string::const_iterator> end(token.end());
        Local<Array> result = Array::New();
        unsigned idx = 0;
        for ( auto && p : dict->search(std::string(begin,end), distance, num_results))
        {
            Local<Array> ar = Array::New();
            ar->Set(0, String::New(p.first.c_str()));
            ar->Set(1, Integer::New(p.second));
            result->Set(idx++,ar);
            //result->Set(String::New(token.c_str()),ar);
        }
        results->Set(index++,result);
        /*
        if (r.size() > 0)
        {
            if (r.front().second == 0)
            {
                std::cerr <<  r.front().first << " [" <<  r.front().second << "] ";
            }
            else
            {
                std::for_each(r.begin(), r.end(), [] (std::pair<std::string,unsigned> const& p)
                              { std::cerr << p.first << "[" << p.second << "] ";} );
            }
            std::cerr << "+ ";
        }
        */
    }
    return scope.Close(results);
}

extern "C" {
    static void start(Handle<Object> target) {
        Engine::Initialize(target);
    }
}

} // namespace node_fss

NODE_MODULE(_fss, node_fss::start)
