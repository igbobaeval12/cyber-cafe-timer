import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const agentDirectory = dirname(fileURLToPath(import.meta.url));
const readAgentFile = (name) => readFileSync(join(agentDirectory, name), 'utf8');

const settings = JSON.parse(readAgentFile('agent-settings.json'));
const launcher = readAgentFile('start-agent.ps1');
const agent = readAgentFile('CyberCafeTimerAgent.ps1');
const startupInstaller = readAgentFile('install-startup.ps1');
const taskInstaller = readAgentFile('install-task.ps1');

test('development settings use localhost and default to PC-01', () => {
  assert.equal(settings.serverUrl, 'http://localhost:3000');
  assert.equal(settings.workstationId, 'PC-01');
  assert.ok(settings.pollIntervalMs > 0);
  assert.ok(settings.gracePeriodMs >= 0);
});

test('launcher delegates polling to the authoritative agent', () => {
  assert.match(launcher, /CyberCafeTimerAgent\.ps1/);
  assert.match(launcher, /& \$agentScript/);
  assert.match(launcher, /-ServerUrl/);
  assert.match(launcher, /-WorkstationId/);
  assert.match(launcher, /-PollIntervalMs/);
  assert.match(launcher, /-GracePeriodMs/);
  assert.doesNotMatch(launcher, /Invoke-RestMethod|while\s*\(|MinimizeAll/);
});

test('authoritative agent fails closed and uses actual Windows locking', () => {
  assert.match(agent, /Invoke-RestMethod[\s\S]*?-ErrorAction Stop/);
  assert.match(agent, /\$authorized = \$false/);
  assert.match(agent, /\$state\.authorized -is \[bool\]/);
  assert.match(agent, /LockWorkStation\(\)/);
  assert.match(agent, /Start-Sleep -Milliseconds \$PollIntervalMs/);
  assert.match(agent, /while\s*\(\$true\)/);
  assert.doesNotMatch(agent, /MinimizeAll/);
});

test('both explicit installers launch the configured wrapper', () => {
  for (const installer of [startupInstaller, taskInstaller]) {
    assert.match(installer, /#Requires -RunAsAdministrator/);
    assert.match(installer, /start-agent\.ps1/);
    assert.match(installer, /ShouldProcess/);
  }
  assert.doesNotMatch(taskInstaller, /CyberCafeTimerAgent\.ps1|https:\/\/localhost/);
});