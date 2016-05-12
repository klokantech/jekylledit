SCRIPTS = jekylledit

TARGET ?= .

.PHONY: all
all: build

.PHONY: serve
serve:
	java -jar $(PLOVR) serve *.json

.PHONY: build
build: $(addprefix $(TARGET)/,$(addsuffix .js,$(SCRIPTS)))

$(TARGET)/%.js: %.json
	java -jar $(PLOVR) build $< > $@

.PHONY: lint
lint:
	fixjsstyle --strict -r src
	gjslint --strict -r src
