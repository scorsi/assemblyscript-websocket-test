let instance = null;
let exports = null;

const hasBigInt64 = typeof BigUint64Array !== "undefined";
let mem, I8, U8, I16, U16, I32, U32, F32, F64, I64, U64;

const checkMem = () => {
    if (mem !== exports.memory.buffer) {
        mem = exports.memory.buffer;
        I8 = new Int8Array(mem);
        U8 = new Uint8Array(mem);
        I16 = new Int16Array(mem);
        U16 = new Uint16Array(mem);
        I32 = new Int32Array(mem);
        U32 = new Uint32Array(mem);
        if (hasBigInt64) {
            I64 = new BigInt64Array(mem);
            U64 = new BigUint64Array(mem);
        }
        F32 = new Float32Array(mem);
        F64 = new Float64Array(mem);
    }
};

const newString = (str) => {
    const dataLength = str.length;
    const ptr = exports["memory.allocate"](4 + (dataLength << 1));
    const dataOffset = (4 + ptr) >>> 1;
    checkMem();
    U32[ptr >>> 2] = dataLength;
    for (let i = 0; i < dataLength; ++i)
        U16[dataOffset + i] = str.charCodeAt(i);
    return ptr;
};

const freeString = (ptr) => {
    exports["memory.free"](ptr);
    checkMem();
};

const getString = (ptr) => {
    checkMem();
    const dataLength = U32[ptr >>> 2];
    let dataOffset = (ptr + 4) >>> 1;
    let dataRemain = dataLength;
    const parts = [];
    const chunkSize = 1024;
    while (dataRemain > chunkSize) {
        let last = U16[dataOffset + chunkSize - 1];
        let size = last >= 0xD800 && last < 0xDC00 ? chunkSize - 1 : chunkSize;
        let part = U16.subarray(dataOffset, dataOffset += size);
        parts.push(String.fromCharCode.apply(String, part));
        dataRemain -= size;
    }
    return parts.join("") + String.fromCharCode.apply(String, U16.subarray(dataOffset, dataOffset + dataRemain));
};

let websocket = null;

if ('WebAssembly' in window) {
    fetch('build/optimized.wasm')
        .then(response => response.arrayBuffer())
        .then(buffer => WebAssembly.instantiate(buffer, {
            console: {
                log(strPtr) {
                    console.log(getString(strPtr));
                }
            },
            env: {
                websocketSend(strPtr) {
                    websocket.send(getString(strPtr));
                },
                abort(mesg, file, line, colm) {
                    mesg = mem ? getString(mesg) : "";
                    file = mem ? getString(file) : "<instantiate>";
                    throw Error("abort: " + mesg + " at " + file + ":" + line + ":" + colm);
                }
            }
        }))
        .then(obj => {
            instance = obj.instance;
            exports = instance.exports;
            console.log(obj);

            websocket = new WebSocket("ws://localhost:8080");
            websocket.onopen = (event) => {
                instance.exports.websocketOnOpen();
            };
            websocket.onclose = (event) => {
                instance.exports.websocketOnClose();
            };
            websocket.onmessage = (event) => {
                let data = newString(event.data);
                instance.exports.websocketOnMessage(data);
                freeString(data);
            };
        })
        .catch(console.error);
} else {
    alert("Your browser doesn't support Web Assembly. You may need " +
        "to enable it in your browser's flags.");
}