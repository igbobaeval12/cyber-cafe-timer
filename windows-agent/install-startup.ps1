#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetScript = Join-Path $scriptDir 'start-agent.ps1'
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir 'Cyber Cafe Timer Agent.lnk'

if ($PSCmdlet.ShouldProcess($shortcutPath, 'Create Cyber Cafe Timer startup shortcut')) {
	$WScriptShell = New-Object -ComObject WScript.Shell
	$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
	$shortcut.TargetPath = 'powershell.exe'
	$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$targetScript`""
	$shortcut.WorkingDirectory = $scriptDir
	$shortcut.WindowStyle = 7
	$shortcut.Save()

	Write-Host "Startup shortcut created at $shortcutPath"
}
