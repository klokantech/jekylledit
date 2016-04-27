PLOVR_VERSION=5.0.1
PLOVR=plovr.jar

.PHONY: all plovr build serve lint webserver

all: build
build: build/jekylledit.js
serve:
	java -jar $(PLOVR) serve *.json
build/%.js: %.json
	mkdir -p build
	java -jar $(PLOVR) build $< > $@
.PHONY: plovr
plovr: $(PLOVR)
$(PLOVR):
	rm -f plovr.jar
	wget --no-check-certificate https://github.com/bolinfest/plovr/releases/download/v$(PLOVR_VERSION)/plovr.jar
lint:
	fixjsstyle --strict -r src
	gjslint --strict -r src
webserver:
	java -jar $(PLOVR) soyweb --dir ..
