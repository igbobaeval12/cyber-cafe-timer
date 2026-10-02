#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetScript = Join-Path $scriptDir 'start-agent.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$targetScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn

if ($PSCmdlet.ShouldProcess('CyberCafeTimerAgent', 'Register scheduled task')) {
	Register-ScheduledTask -TaskName 'CyberCafeTimerAgent' -Action $action -Trigger $trigger -Force
}
