const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');

module.exports = function (RED) {
    function prepareParams(p) {
        if (p instanceof Float32Array || p instanceof Float64Array) {
            return Buffer.from(p.buffer, p.byteOffset, p.byteLength);
        }
        if (Buffer.isBuffer(p)) {
            return p;
        }
        if (typeof p === 'bigint') {
            return p;
        }
        if (Array.isArray(p)) {
            if (p.length > 0 && p.every(v => typeof v === 'number')) {
                return Buffer.from(new Float32Array(p).buffer);
            }
            return p.map(item => prepareParams(item));
        }
        if (p !== null && typeof p === 'object') {
            const result = {};
            for (const key in p) {
                result[key] = prepareParams(p[key]);
            }
            return result;
        }
        // If it's a number and it's an integer, force it to BigInt to ensure SQLite INTEGER binding
        if (typeof p === 'number' && Number.isSafeInteger(p)) {
            return BigInt(p);
        }
        return p;
    }

    function SqliteVecNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.dbPath = config.dbPath || 'vector.db';
        node.operation = config.operation || 'query';
        let db = null;

        try {
            db = new Database(node.dbPath);
            sqliteVec.load(db);
            node.status({ fill: "green", shape: "dot", text: "connected" });
        } catch (err) {
            node.error("Failed to initialize database: " + err.message);
            node.status({ fill: "red", shape: "ring", text: "db error" });
        }

        node.on('input', async function (msg, send, done) {
            if (!db) {
                node.error("Database not initialized", msg);
                if (done) done();
                return;
            }

            node.status({ fill: "blue", shape: "dot", text: "processing..." });

            try {
                let sql = (config.sql && config.sql.trim() !== "") ? config.sql : msg.topic;
                let params = msg.params !== undefined ? msg.params : msg.payload;

                if (!sql) {
                    node.error("No SQL query provided in msg.topic or node config", msg);
                    node.status({ fill: "yellow", shape: "ring", text: "missing sql" });
                    if (done) done();
                    return;
                }

                params = prepareParams(params);

                if (node.operation === 'query') {
                    const stmt = db.prepare(sql);
                    // SQLite placeholders: ?, ?NNN, :VVV, @VVV, $VVV
                    const hasPlaceholders = /[\?]|[:@$][a-zA-Z]+/.test(sql);

                    // Only bind if we have an array, or an object (that isn't null), 
                    // or if it's a primitive AND we actually expect placeholders.
                    const isComplex = Array.isArray(params) || (params !== null && typeof params === 'object');
                    const shouldBind = isComplex || (hasPlaceholders && params !== undefined && params !== null);

                    const results = shouldBind ? stmt.all(params) : stmt.all();
                    msg.payload = results;
                } else if (node.operation === 'execute') {
                    const hasPlaceholders = /[\?]|[:@$][a-zA-Z]+/.test(sql);
                    const isComplex = Array.isArray(params) || (params !== null && typeof params === 'object');
                    const shouldBind = isComplex || (hasPlaceholders && params !== undefined && params !== null);

                    if (shouldBind) {
                        const stmt = db.prepare(sql);
                        const info = stmt.run(params);
                        msg.payload = info;
                    } else {
                        // Use exec() to support multiple statements (e.g. initialization scripts)
                        db.exec(sql);
                        msg.payload = { changes: 0, lastInsertRowid: 0, multiStatement: true };
                    }
                }

                node.status({ fill: "green", shape: "dot", text: "done" });
                send(msg);
            } catch (err) {
                const errorMsg = "SQL execution failed: " + err.message + (params ? " | Params: " + JSON.stringify(params, (key, value) => typeof value === 'bigint' ? value.toString() : value) : "");
                node.error(errorMsg, msg);
                node.status({ fill: "red", shape: "ring", text: "error" });
            }

            if (done) done();
        });

        node.on('close', function (removed, done) {
            if (db) {
                db.close();
            }
            if (done) done();
        });
    }

    RED.nodes.registerType("sqlite-vec", SqliteVecNode);
};
