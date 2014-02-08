test: deps
	./node_modules/mocha/bin/mocha --harmony --ui exports --reporter spec

deps:
	npm install
