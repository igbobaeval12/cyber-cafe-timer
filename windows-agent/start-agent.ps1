$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir 'agent-settings.json'

if (-not (Test-Path $configPath)) {
    throw "Missing agent-settings.json in $scriptDir"
}

$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
$serverUrl = [string]$config.serverUrl
$workstationId = if ($config.workstationId) { [string]$config.workstationId } else { 'PC-01' }
$pollIntervalMs = if ($config.pollIntervalMs) { [int]$config.pollIntervalMs } else { 5000 }
$gracePeriodMs = if ($config.gracePeriodMs) { [int]$config.gracePeriodMs } else { 15000 }

if ([string]::IsNullOrWhiteSpace($serverUrl)) {
    throw 'serverUrl must be set in agent-settings.json'
}

$serverUri = [uri]$serverUrl
if (-not $serverUri.IsAbsoluteUri -or ($serverUri.Scheme -ne 'https' -and -not ($serverUri.Scheme -eq 'http' -and $serverUri.IsLoopback))) {
    throw 'serverUrl must use HTTPS, or HTTP on localhost for development'
}

$agentScript = Join-Path $scriptDir 'CyberCafeTimerAgent.ps1'
if (-not (Test-Path $agentScript)) {
    throw "Missing authoritative agent script: $agentScript"
}

& $agentScript `
    -ServerUrl $serverUri.AbsoluteUri.TrimEnd('/') `
    -WorkstationId $workstationId `
    -PollIntervalMs $pollIntervalMs `
    -GracePeriodMs $gracePeriodMs
