import { ChildProcess, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';

const serverPath = path.resolve(__dirname, 'server.ts');
let child: ChildProcess | undefined;
let stopping = false;

const start = () => {
    child = spawn(process.execPath, ['--import', 'tsx', serverPath], {
        cwd: path.resolve(__dirname, '..', '..'),
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        windowsHide: true
    });
    child.once('exit', (code, signal) => {
        child = undefined;
        if (stopping) return;
        if (code === 75) {
            console.log('Remote Codex: applying deferred server restart');
            start();
            return;
        }
        console.error(`Remote Codex server stopped (${signal || code}); restarting in 1 second`);
        setTimeout(start, 1000);
    });
};

watch(__dirname, { persistent: true }, (_eventType, filename) => {
    if (filename?.toString().toLowerCase() !== 'server.ts' || !child?.connected) return;
    console.log('Remote Codex: server change detected; restart requested');
    child.send({ type: 'restart-requested' });
});

const shutdown = () => {
    if (stopping) return;
    stopping = true;
    if (!child) process.exit(0);
    child.once('exit', () => process.exit(0));
    child.send?.({ type: 'shutdown-requested' });
    setTimeout(() => child?.kill('SIGTERM'), 2500);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
start();
