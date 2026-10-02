# Local LAN Deployment Guide

## Overview
This application is designed to run on a local network with one admin server and multiple client PCs. The server exposes the admin and client routes over the local network and can operate without internet access for the core timer and billing workflow.

## Prerequisites
- Node.js 20+
- pnpm
- MySQL-compatible database (or local fallback mode for smoke tests)
- LAN connectivity between the admin server and client PCs

## Installation
1. Install dependencies with `pnpm install`
2. Build the project with `pnpm build`
3. Start the server with `pnpm start`

## Network Configuration
- Ensure the server machine has a static IP on the LAN.
- Open the relevant local ports used by the application.
- Configure client workstations to connect to the server IP.

## Production Checklist
- Use a real MySQL database for persistent storage.
- Configure environment variables for database access and security.
- Enable firewall permissions only for the necessary local traffic.
- Test reconnect behavior and timer synchronization before deployment.
