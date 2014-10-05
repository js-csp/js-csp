BUNDLE = NODE_PATH="./src:$(NODE_PATH)" ./node_modules/.bin/browserify

.PHONY: all deps test bundle-browser bundle-node

all: deps test bundle-browser bundle-node

test: deps
	./node_modules/mocha/bin/mocha --harmony --ui exports --reporter spec

deps:
	npm install

# TODO: Maybe use gulp instead (to use the more flexible browserify
# API instead of hacking the environment variable like this)
bundle-browser: deps
	$(BUNDLE) src/csp.js -r csp -o build/csp.bundled.browser.js

bundle-node: deps
	$(BUNDLE) -s src/csp.js -r csp -o build/csp.bundled.node.js
