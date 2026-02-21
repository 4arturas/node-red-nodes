const cheerio = require('cheerio');

module.exports = function (RED) {
    function CheerioNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.selector = config.selector || '';
        node.attribute = config.attribute || 'text';
        node.outputFormat = config.outputFormat || 'string';

        node.on('input', function (msg, send, done) {
            try {
                const html = msg.payload;

                if (!html) {
                    node.warn("Empty payload received, nothing to parse.");
                    node.status({ fill: "yellow", shape: "ring", text: "empty payload" });
                    if (done) done();
                    return;
                }

                const $ = cheerio.load(html.toString());
                let result;

                if (node.selector) {
                    const elements = $(node.selector);

                    // Handle array output format
                    if (node.outputFormat === 'array') {
                        const arr = [];
                        elements.each(function () {
                            let val;
                            const el = $(this);
                            if (node.attribute === 'text') {
                                val = el.text().trim();
                            } else if (node.attribute === 'html') {
                                val = el.html();
                            } else if (node.attribute === 'attr') {
                                const attrName = config.attributeName || 'href';
                                val = el.attr(attrName);
                            } else if (node.attribute === 'val') {
                                val = el.val();
                            } else {
                                val = el.attr(node.attribute);
                            }
                            if (val !== undefined && val !== null) {
                                arr.push(val);
                            }
                        });
                        result = arr;
                    } else {
                        // Handle single string output format
                        if (node.attribute === 'text') {
                            result = elements.text().trim();
                        } else if (node.attribute === 'html') {
                            result = elements.html();
                        } else if (node.attribute === 'attr') {
                            const attrName = config.attributeName || 'href';
                            result = elements.attr(attrName);
                        } else if (node.attribute === 'val') {
                            result = elements.val();
                        } else {
                            result = elements.attr(node.attribute);
                        }
                    }
                } else {
                    // No selector - return full body/html
                    result = $('body').html() || $('html').html() || html.toString();
                }

                msg.payload = result;
                node.status({ fill: "green", shape: "dot", text: "parsed" });
                send(msg);

            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error("Cheerio parsing failed: " + error.message, msg);
            }

            if (done) done();
        });
    }

    RED.nodes.registerType("cheerio", CheerioNode);
};
