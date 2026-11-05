// Starts XAMPP's MySQL/MariaDB using the port from .env.
// Useful when another MySQL install already owns port 3306.
// Usage: npm run db:start

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PORT = Number(process.env.DB_PORT || 3306);
const MYSQL_BIN = process.env.XAMPP_MYSQL_BIN || 'C:/xampp/mysql/bin/mysqld.exe';
const MYSQL_INI = process.env.XAMPP_MYSQL_INI || 'C:/xampp/mysql/bin/my.ini';

function portOpen(port) {
    return new Promise((resolve) => {
        const socket = net.connect({ host: '127.0.0.1', port });
        const done = (open) => {
            socket.destroy();
            resolve(open);
        };
        socket.setTimeout(1000);
        socket.once('connect', () => done(true));
        socket.once('timeout', () => done(false));
        socket.once('error', () => done(false));
    });
}

async function waitForPort(port, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await portOpen(port)) return true;
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return false;
}

async function main() {
    if (await portOpen(PORT)) {
        console.log(`MySQL is already listening on 127.0.0.1:${PORT}.`);
        return;
    }

    if (!fs.existsSync(MYSQL_BIN)) {
        console.error(`Could not find XAMPP MySQL at:\n  ${MYSQL_BIN}`);
        console.error('Set XAMPP_MYSQL_BIN and XAMPP_MYSQL_INI in .env, or start MySQL from the XAMPP Control Panel.');
        process.exitCode = 1;
        return;
    }

    console.log(`Starting XAMPP MySQL on port ${PORT} ...`);
    const child = spawn(
        MYSQL_BIN,
        [`--defaults-file=${MYSQL_INI}`, `--port=${PORT}`, '--console'],
        { detached: true, stdio: 'ignore' }
    );
    child.unref();

    if (await waitForPort(PORT, 10000)) {
        console.log(`XAMPP MySQL is ready on 127.0.0.1:${PORT}.`);
    } else {
        console.error('MySQL did not start. Check the XAMPP MySQL data directory and logs.');
        process.exitCode = 1;
    }
}

main();
