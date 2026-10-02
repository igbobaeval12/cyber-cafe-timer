import net from "node:net";
import tls from "node:tls";
import { ENV } from "./env";
import { logger } from "./logger";

export type LeadNotification =
  | { type: "trial"; lead: { fullName: string; businessName: string; email: string; phone: string; numberOfPcs: number; createdAt?: Date | null } }
  | { type: "sales"; lead: { fullName: string; businessName: string; email: string; phone: string; numberOfPcs: number; message: string; createdAt?: Date | null } };

type SmtpSocket = net.Socket | tls.TLSSocket;

function smtpConfig() {
  const host = ENV.smtpHost.trim();
  const port = Number(ENV.smtpPort || 587);
  const user = ENV.smtpUser.trim();
  const password = ENV.smtpPassword;
  const from = ENV.smtpFrom.trim();
  const recipient = ENV.leadNotificationEmail.trim();
  if (!host || !Number.isInteger(port) || !from || !recipient) return null;
  return { host, port, user, password, from, recipient };
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]/g, " ");
}

function escapeBody(value: unknown) {
  return String(value ?? "").replace(/[\r\n]/g, (match) => match === "\n" ? "\r\n" : "").trim();
}

function formatLead(notification: LeadNotification) {
  const { type, lead } = notification;
  const isTrial = type === "trial";
  const subject = isTrial ? "New Free Trial Registration" : "New Contact Sales Inquiry";
  const lines = [
    `Lead type: ${isTrial ? "Free Trial" : "Sales Inquiry"}`,
    `Business name: ${escapeBody(lead.businessName)}`,
    `Contact name: ${escapeBody(lead.fullName)}`,
    `Email: ${escapeBody(lead.email)}`,
    `Phone: ${escapeBody(lead.phone)}`,
    `Number of PCs: ${escapeBody(lead.numberOfPcs)}`,
    `Submitted: ${(lead.createdAt ?? new Date()).toISOString()}`,
  ];
  if (!isTrial) lines.push(`Message: ${escapeBody(lead.message)}`);
  return { subject, body: lines.join("\r\n") };
}

function readResponse(socket: SmtpSocket) {
  return new Promise<string>((resolve, reject) => {
    let data = "";
    const onData = (chunk: Buffer) => {
      data += chunk.toString("utf8");
      const lines = data.split("\r\n").filter(Boolean);
      const last = lines.at(-1) ?? "";
      if (/^\d{3} /.test(last)) {
        socket.off("data", onData);
        resolve(last);
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
}

async function command(socket: SmtpSocket, value: string, expected: RegExp) {
  socket.write(`${value}\r\n`);
  const response = await readResponse(socket);
  if (!expected.test(response)) throw new Error(`SMTP command failed: ${response}`);
}

function connect(config: ReturnType<typeof smtpConfig>) {
  if (!config) throw new Error("SMTP is not configured");
  return new Promise<SmtpSocket>((resolve, reject) => {
    const socket = config.port === 465 ? tls.connect({ host: config.host, port: config.port, servername: config.host }) : net.connect(config.port, config.host);
    socket.once("connect", () => resolve(socket));
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function sendSmtp(config: NonNullable<ReturnType<typeof smtpConfig>>, message: { subject: string; body: string }) {
  let socket = await connect(config);
  try {
    await readResponse(socket);
    await command(socket, "EHLO localhost", /^250/);
    if (config.port !== 465) {
      await command(socket, "STARTTLS", /^220/);
      socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const secure = tls.connect({ socket, servername: config.host }, () => resolve(secure));
        secure.once("error", reject);
      });
      await command(socket, "EHLO localhost", /^250/);
    }
    if (config.user && config.password) {
      await command(socket, "AUTH LOGIN", /^334/);
      await command(socket, Buffer.from(config.user).toString("base64"), /^334/);
      await command(socket, Buffer.from(config.password).toString("base64"), /^235/);
    }
    await command(socket, `MAIL FROM:<${escapeHeader(config.from)}>`, /^250/);
    await command(socket, `RCPT TO:<${escapeHeader(config.recipient)}>`, /^(250|251)/);
    const content = `From: ${escapeHeader(config.from)}\r\nTo: ${escapeHeader(config.recipient)}\r\nSubject: ${escapeHeader(message.subject)}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message.body.replace(/\r?\n/g, "\r\n")}\r\n.`;
    await command(socket, "DATA", /^354/);
    socket.write(`${content}\r\n`);
    await command(socket, ".", /^250/);
    await command(socket, "QUIT", /^221/);
  } finally {
    socket.end();
  }
}

export async function sendLeadNotification(notification: LeadNotification) {
  const config = smtpConfig();
  if (!config) {
    logger.info("lead_email_not_configured");
    return false;
  }
  await sendSmtp(config, formatLead(notification));
  logger.info("lead_email_sent", { leadType: notification.type });
  return true;
}

export function notifyLeadInBackground(notification: LeadNotification) {
  void sendLeadNotification(notification).catch((error) => {
    logger.error("lead_email_failed", { leadType: notification.type, error });
  });
}
