# Cyber Café Timer Windows Agent

This folder contains a Windows workstation agent that connects to the existing Cyber Café Timer server rather than creating a separate backend or database. Nothing installs or starts it automatically; an administrator must explicitly run an installer.

## What it does

- Uses the configured workstation identity (default `PC-01`)
- Polls the existing server for the workstation authorization state
- Calls the Windows `LockWorkStation()` API when authorization is absent or lost
- Continues polling while Windows is locked so authorization can recover

## Security model

- The server remains authoritative for active-session checks.
- Authorization is bound to the requested workstation and an active server session.
- Network and HTTP failures are unauthorized; they never grant access.
- The agent uses the server’s `/api/workstation-state` endpoint to decide whether access is allowed.
- It never creates a second database or bypasses the existing admin/staff/customer authentication rules.

## Launch flow

1. An administrator explicitly runs `install-startup.ps1` or `install-task.ps1`.
2. Either installer launches `start-agent.ps1` at the next logon.
3. The wrapper reads `agent-settings.json` and calls `CyberCafeTimerAgent.ps1`.
4. The authoritative agent polls server authorization and locks Windows when required.

## Required configuration

`agent-settings.json` is set up for local development. The server uses `PORT` when configured and otherwise prefers port `3000`; check the server's `server_started` log because it may choose the next free port if that port is occupied. Set `serverUrl` to that actual local port when needed:

```json
{
  "serverUrl": "http://localhost:3000",
  "workstationId": "PC-01",
  "pollIntervalMs": 5000,
  "gracePeriodMs": 15000
}
```

For production, set `serverUrl` to the actual deployed HTTPS URL. No production URL is assumed. HTTP is accepted only for loopback development; network or HTTP errors remain unauthorized, subject to the configured grace period after an authorized session.

`start-agent.ps1` reads the configuration and delegates all polling and locking to `CyberCafeTimerAgent.ps1`. The two installer scripts require administrator execution and ask for confirmation; they are not run by this project or by the agent.

## Notes

This implementation is a Windows-native operational scaffold, not a full browser kiosk application. It is designed to integrate with the existing web application and server rules already present in this project.
