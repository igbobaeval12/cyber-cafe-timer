param(
    [Parameter(Mandatory = $true)]
    [string]$ServerUrl,
    [Parameter(Mandatory = $true)]
    [string]$WorkstationId = "PC-01",
    [int]$PollIntervalMs = 5000,
    [int]$GracePeriodMs = 15000
)

$ErrorActionPreference = 'Stop'

function Write-Log([string]$Message) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$timestamp] $Message"
}

function Get-WorkstationState {
    param([string]$Url, [string]$Id)

    $target = "$Url/api/workstation-state?workstationId=$([System.Uri]::EscapeDataString($Id))"
    return Invoke-RestMethod -Uri $target -Method Get -TimeoutSec 10 -ErrorAction Stop
}

function Lock-Workstation {
    Write-Log "Locking workstation $WorkstationId"
    try {
        $nativeType = 'CyberCafeTimer.Agent.NativeMethods' -as [type]
        if ($null -eq $nativeType) {
            $nativeType = Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
namespace CyberCafeTimer.Agent {
    public static class NativeMethods {
        [DllImport("user32.dll")]
        public static extern bool LockWorkStation();
    }
}
'@ -PassThru
        }
        if ($nativeType::LockWorkStation()) {
            return $true
        }
        Write-Log "LockWorkStation API returned false; trying Windows fallback"
    }
    catch {
        Write-Log "LockWorkStation API failed: $($_.Exception.Message)"
    }

    try {
        & "$env:SystemRoot\System32\rundll32.exe" user32.dll,LockWorkStation
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        Write-Log "Fallback lock failed: $($_.Exception.Message)"
        return $false
    }
}

Write-Log "Cyber Cafe Timer Windows Agent starting for $WorkstationId"
$lastKnownAuthorized = $false
$gracePeriodEnd = $null
$lockIssued = $false

while ($true) {
    $state = $null
    try {
        $state = Get-WorkstationState -Url $ServerUrl -Id $WorkstationId
    }
    catch {
        Write-Log "Poll failed: $($_.Exception.Message)"
    }

    $authorized = $false
    if ($null -ne $state -and $state.authorized -is [bool]) {
        $authorized = $state.authorized
    }

    if ($authorized) {
        $lastKnownAuthorized = $true
        $gracePeriodEnd = $null
        $lockIssued = $false
        Write-Log "Workstation authorized for active session"
    }
    elseif ($lastKnownAuthorized) {
        if ($null -eq $gracePeriodEnd) {
            $gracePeriodEnd = (Get-Date).AddMilliseconds($GracePeriodMs)
        }

        if ((Get-Date) -ge $gracePeriodEnd) {
            Write-Log "Authorization lost or server unavailable; locking workstation"
            $lockIssued = Lock-Workstation
            $lastKnownAuthorized = $false
            $gracePeriodEnd = $null
        }
        else {
            Write-Log "Waiting for authorization grace period to expire"
        }
    }
    elseif (-not $lockIssued) {
        Write-Log "No active authorized session; locking workstation"
        $lockIssued = Lock-Workstation
    }

    Start-Sleep -Milliseconds $PollIntervalMs
}
