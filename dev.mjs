// Starts the Laravel API and the Vite dev server together: node dev.mjs
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const backendDir = join(root, 'backend');
const frontendDir = join(root, 'frontend');

const HOST = '127.0.0.1';
const FIRST_BACKEND_PORT = 8000;
const LAST_BACKEND_PORT = 8020;
// APP_URL and SANCTUM_STATEFUL_DOMAINS point to this port, so it cannot move.
const FRONTEND_PORT = 5173;

const isWindows = process.platform === 'win32';

const prerequisites = [
    [join(backendDir, '.env'), 'Salin backend/.env.example menjadi backend/.env.'],
    [join(backendDir, 'vendor'), 'Jalankan "composer install" di folder backend.'],
    [join(frontendDir, 'node_modules'), 'Jalankan "npm ci" di folder frontend.'],
];

function fail(message) {
    console.error(`\n[dev] ${message}\n`);
    process.exit(1);
}

function isPortInUse(port) {
    return new Promise((resolve) => {
        // Vite listens on ::1 while PHP listens on 127.0.0.1; "localhost" probes both.
        const socket = connect({ host: 'localhost', port });

        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => resolve(false));
    });
}

async function findBackendPort() {
    for (let port = FIRST_BACKEND_PORT; port <= LAST_BACKEND_PORT; port += 1) {
        if (!(await isPortInUse(port))) {
            return port;
        }
    }

    fail(`Tidak ada port kosong antara ${FIRST_BACKEND_PORT} dan ${LAST_BACKEND_PORT}.`);
}

const children = [];
let stopping = false;

// `artisan serve` runs PHP in a child process, so the whole tree has to be stopped.
function stopProcessTree(child) {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
        return;
    }

    if (isWindows) {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
        process.kill(-child.pid, 'SIGTERM');
    }
}

function stopAll(exitCode) {
    if (stopping) {
        return;
    }

    stopping = true;
    children.forEach(stopProcessTree);
    process.exit(exitCode);
}

function start(name, command, args, options) {
    const child = spawn(command, args, { ...options, stdio: 'inherit', detached: !isWindows });

    child.once('error', (error) => {
        console.error(`\n[dev] ${name} gagal dijalankan: ${error.message}\n`);
        stopAll(1);
    });
    child.once('exit', () => {
        if (!stopping) {
            console.error(`\n[dev] ${name} berhenti, proses lain ikut dihentikan.\n`);
            stopAll(1);
        }
    });
    children.push(child);
}

for (const [path, instruction] of prerequisites) {
    if (!existsSync(path)) {
        fail(`${path} tidak ditemukan. ${instruction}`);
    }
}

if (await isPortInUse(FRONTEND_PORT)) {
    fail(`Port ${FRONTEND_PORT} sedang dipakai. Hentikan proses tersebut lalu jalankan lagi.`);
}

const backendPort = await findBackendPort();
const backendUrl = `http://${HOST}:${backendPort}`;

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));

console.log(`[dev] Aplikasi: http://localhost:${FRONTEND_PORT}`);
console.log(`[dev] Backend:  ${backendUrl}`);
console.log('[dev] Tekan Ctrl+C untuk menghentikan keduanya.\n');

start('Backend', 'php', ['artisan', 'serve', `--host=${HOST}`, `--port=${backendPort}`], {
    cwd: backendDir,
});
start('Frontend', process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: frontendDir,
    env: { ...process.env, BACKEND_URL: backendUrl },
});
