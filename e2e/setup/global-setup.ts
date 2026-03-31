import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI = path.resolve(__dirname, '../../bin/localm365');

function isLoggedIn(): boolean {
  try {
    const result = execFileSync('node', [CLI, 'status', '-o', 'json'], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    });
    const status = JSON.parse(result.trim());
    return status.connectedAs !== undefined && status.connectedAs !== '';
  } catch {
    return false;
  }
}

export function setup() {
  if (isLoggedIn()) {
    console.log('Already authenticated to M365.');
    return;
  }

  const appId = process.env.DOCTOR_E2E_APP_ID;
  const tenantId = process.env.DOCTOR_E2E_TENANT_ID;
  const certBase64 = process.env.DOCTOR_E2E_CERTIFICATE_BASE64;
  const certBase64File = process.env.DOCTOR_E2E_CERTIFICATE_BASE64_FILE;

  let certValue = certBase64;
  if (!certValue && certBase64File) {
    certValue = fs.readFileSync(certBase64File, 'utf-8').trim();
  }

  if (!appId || !tenantId || !certValue) {
    throw new Error(
      'Missing required environment variables: DOCTOR_E2E_APP_ID, DOCTOR_E2E_TENANT_ID, and either DOCTOR_E2E_CERTIFICATE_BASE64 or DOCTOR_E2E_CERTIFICATE_BASE64_FILE'
    );
  }

  const certPassword = process.env.DOCTOR_E2E_CERTIFICATE_PASSWORD || '';

  console.log('Authenticating to M365...');
  execFileSync('node', [
    CLI,
    'login',
    '--authType', 'certificate',
    '--appId', appId,
    '--tenant', tenantId,
    '--certificateBase64Encoded', certValue,
    '--password', certPassword,
  ], { stdio: 'pipe', timeout: 60000 });
  console.log('Authenticated.');
}

export function teardown() {
  try {
    execFileSync('node', [CLI, 'logout'], { stdio: 'pipe', timeout: 15000 });
  } catch {
    // Ignore logout errors
  }
}
