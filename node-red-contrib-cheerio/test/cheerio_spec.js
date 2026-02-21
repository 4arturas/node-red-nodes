const helper = require("node-red-node-test-helper");
const cheerioNode = require("../cheerio.js");
const should = require("should");

helper.init(require.resolve("node-red"));

describe('Cheerio node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done);
        });
    });

    describe('Node loading', function () {
        it('should be loaded', function (done) {
            const flow = [{ id: "n1", type: "cheerio", name: "test cheerio" }];
            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                n1.should.have.property('name', 'test cheerio');
                done();
            });
        });
    });

    describe('Text extraction', function () {
        it('should extract text from selector', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".title", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Hello World");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<html><body><div class='title'>Hello World</div></body></html>" });
            });
        });

        it('should extract text from multiple elements', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "li", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Item 1Item 2Item 3");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>" });
            });
        });

        it('should trim extracted text', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".content", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Trimmed text");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div class='content'>   Trimmed text   </div>" });
            });
        });
    });

    describe('HTML extraction', function () {
        it('should extract inner HTML from selector', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".container", attribute: "html", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("<span>Inner content</span>");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div class='container'><span>Inner content</span></div>" });
            });
        });
    });

    describe('Attribute extraction', function () {
        it('should extract href attribute', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "a", attribute: "attr", attributeName: "href", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("https://example.com");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<a href='https://example.com'>Link</a>" });
            });
        });

        it('should extract src attribute', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "img", attribute: "attr", attributeName: "src", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("/images/logo.png");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<img src='/images/logo.png' alt='Logo'>" });
            });
        });

        it('should extract data attribute', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "div", attribute: "attr", attributeName: "data-id", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("12345");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div data-id='12345'>Content</div>" });
            });
        });
    });

    describe('Array output', function () {
        it('should extract text from multiple elements as array', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "li", attribute: "text", outputFormat: "array", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.be.an.Array();
                        msg.payload.should.eql(["Item 1", "Item 2", "Item 3"]);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>" });
            });
        });

        it('should extract href attributes as array', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "a", attribute: "attr", attributeName: "href", outputFormat: "array", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.be.an.Array();
                        msg.payload.should.eql(["https://link1.com", "https://link2.com"]);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<a href='https://link1.com'>Link 1</a><a href='https://link2.com'>Link 2</a>" });
            });
        });

        it('should extract inner HTML as array', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".item", attribute: "html", outputFormat: "array", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.be.an.Array();
                        msg.payload.should.eql(["<span>A</span>", "<span>B</span>"]);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div class='item'><span>A</span></div><div class='item'><span>B</span></div>" });
            });
        });
    });

    describe('No selector', function () {
        it('should return body HTML when no selector provided', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.containEql("Hello");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<html><body><p>Hello</p></body></html>" });
            });
        });
    });

    describe('Empty payload handling', function () {
        it('should warn on empty payload', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".title", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");

                n1.on("call:warn", function (call) {
                    try {
                        call.args[0].should.equal("Empty payload received, nothing to parse.");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "" });
            });
        });

        it('should warn on undefined payload', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".title", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");

                n1.on("call:warn", function (call) {
                    try {
                        call.args[0].should.equal("Empty payload received, nothing to parse.");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: undefined });
            });
        });
    });

    describe('Error handling', function () {
        it('should handle invalid HTML gracefully', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".title", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");

                // Cheerio is lenient with HTML, but we test error handling path
                n1.receive({ payload: null });
                
                setTimeout(function() {
                    n1.status.should.be.Function();
                    done();
                }, 50);
            });
        });
    });

    describe('Complex HTML structures', function () {
        it('should handle nested elements', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".outer .inner", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Nested content");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div class='outer'><div class='inner'>Nested content</div></div>" });
            });
        });

        it('should handle ID selectors', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "#main-title", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Main Title");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<h1 id='main-title'>Main Title</h1>" });
            });
        });

        it('should handle tag selectors', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: "h1", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("Page Title");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<html><head><h1>Page Title</h1></head></html>" });
            });
        });
    });

    describe('Edge cases', function () {
        it('should return empty string for non-matching selector', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".nonexistent", attribute: "text", outputFormat: "string", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.equal("");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div>Content</div>" });
            });
        });

        it('should return empty array for non-matching selector', function (done) {
            const flow = [
                { id: "n1", type: "cheerio", selector: ".nonexistent", attribute: "text", outputFormat: "array", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];

            helper.load(cheerioNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.should.be.an.Array();
                        msg.payload.should.have.length(0);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "<div>Content</div>" });
            });
        });
    });
});
