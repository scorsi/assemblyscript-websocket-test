import "allocator/tlsf";
// @ts-ignore
export { memory };

declare namespace console {
    function log(s: string): void;
}

// @ts-ignore
@external("env", "websocketSend")
declare function websocketSend(data: string): void;

export function websocketOnOpen(): void {
    console.log("Opened");
    websocketSend("Hello server")
}

export function websocketOnClose(): void {
    console.log("Closed");
}

export function websocketOnMessage(data: string): void {
    console.log("Received: " + data);
}
