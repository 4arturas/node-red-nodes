const helper = require("node-red-node-test-helper");
const chatOllamaNode = require("../chat-ollama.js");
const should = require("should");
const sinon = require("sinon");
const { ChatOllama } = require("@langchain/ollama");

helper.init(require.resolve("node-red"));

describe('chat-ollama node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done);
        });
        sinon.restore();
    });

    it('should be loaded', function (done) {
        const flow = [{ id: "n1", type: "chat-ollama", name: "test name" }];
        helper.load(chatOllamaNode, flow, function () {
            const n1 = helper.getNode("n1");
            n1.should.have.property('name', 'test name');
            done();
        });
    });

    it('should handle input and return content', function (done) {
        const flow = [
            { id: "n1", type: "chat-ollama", name: "test name", baseUrl: "http://localhost:11434", modelName: "llama3", temperature: "0.7", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        const stubValue = {
            content: "Mocked response from Ollama",
            additional_kwargs: {}
        };
        const invokeStub = sinon.stub(ChatOllama.prototype, "invoke").resolves(stubValue);

        helper.load(chatOllamaNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload', 'Mocked response from Ollama');
                    msg.should.have.property('rawResponse');
                    invokeStub.calledOnce.should.be.true();
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "Hello" });
        });
    });

    it('should handle errors gracefully', function (done) {
        const flow = [
            { id: "n1", type: "chat-ollama", name: "test name", baseUrl: "http://localhost:11434", modelName: "llama3", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        const invokeStub = sinon.stub(ChatOllama.prototype, "invoke").rejects(new Error("Connection failed"));

        helper.load(chatOllamaNode, flow, function () {
            const n1 = helper.getNode("n1");

            n1.on("call:error", function (call) {
                try {
                    call.args[0].message.should.equal("Connection failed");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "Hello" });
        });
    });
});
