const http = require('http');
const { spawn } = require('child_process');

const BACKEND_HEALTH_URL = 'http://localhost:5001/api/health';
const RETRY_DELAY_MS = 250;

const backendIsReady = () => new Promise((resolve) => {
  const request = http.get(BACKEND_HEALTH_URL, (response) => {
    response.resume();
    resolve(response.statusCode === 200);
  });

  request.on('error', () => resolve(false));
  request.setTimeout(1_000, () => {
    request.destroy();
    resolve(false);
  });
});

const waitForBackend = async () => {
  while (!(await backendIsReady())) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
};

const startFrontend = async () => {
  process.stdout.write('Waiting for backend before starting frontend...\n');
  await waitForBackend();
  process.stdout.write('Backend is ready. Starting frontend...\n');

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const frontend = spawn(npmCommand, ['run', 'dev', '--prefix', 'frontend'], { stdio: 'inherit' });
  frontend.on('exit', (code) => process.exit(code ?? 0));
};

startFrontend().catch((error) => {
  console.error('Could not start frontend:', error);
  process.exit(1);
});
