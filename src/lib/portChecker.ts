import * as net from 'net';

/**
 * Checks if something is listening on the given TCP port.
 * Returns true if Tomcat (or any process) appears to be running on that port.
 */
export function isTomcatRunning(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(400);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
    });
}
