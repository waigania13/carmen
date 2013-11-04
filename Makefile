
all: binding

binding:
	`npm explore npm -g -- pwd`/bin/node-gyp-bin/node-gyp build

clean:
	@rm -f src/index.pb.cc
	@rm -f src/index.pb.h
	@rm -rf ./build
	@rm -f lib/util/*.node

rebuild:
	@make clean
	@./configure
	@make

test:
	./node_modules/.bin/mocha test/cache.test.js

check: test

.PHONY: test
