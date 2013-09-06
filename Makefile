CXXFLAGS := $(CXXFLAGS) # inherit from env
LDFLAGS := $(LDFLAGS) # inherit from env

all: binding

binding:
	node-gyp build --verbose

clean:
	@rm -f src/index.pb.cc
	@rm -f src/index.pb.h
	@rm -rf ./build
	@rm -f lib/*.node

rebuild:
	@make clean
	@./configure
	@make

test:
	./node_modules/.bin/mocha test/cache.test.js

check: test

.PHONY: test
