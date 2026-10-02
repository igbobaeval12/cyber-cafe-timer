import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./_core/email", () => ({ notifyLeadInBackground: vi.fn() }));
import { appRouter } from "./routers";
import * as dbModule from "./db";
import * as emailModule from "./_core/email";
import type { TrpcContext } from "./_core/context";

const trialInput = {
  fullName: "Alex Rivera",
  businessName: "Rivera Cafe",
  email: "alex@example.com",
  phone: "+1 555 0100",
  numberOfPcs: 20,
};

const salesInput = {
  ...trialInput,
  message: "Please tell me about setup.",
};

function caller() {
  const context: TrpcContext = {
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(context);
}

function adminCaller() {
  const context: TrpcContext = {
    user: { id: 1, role: "admin" } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(context);
}

afterEach(() => vi.restoreAllMocks());

describe("public lead procedures", () => {
  it("registers a valid trial", async () => {
    const createSpy = vi.spyOn(dbModule, "createTrialRegistration").mockResolvedValue({ id: 12, status: "pending_setup" });

    await expect(caller().leads.registerTrial(trialInput)).resolves.toEqual({ id: 12, status: "pending_setup" });
    expect(createSpy).toHaveBeenCalledWith(trialInput);
    expect(emailModule.notifyLeadInBackground).toHaveBeenCalledWith({ type: "trial", lead: trialInput });
  });

  it("rejects duplicate email registration", async () => {
    vi.spyOn(dbModule, "createTrialRegistration").mockRejectedValue(new Error("An account or trial registration already exists for this email"));

    await expect(caller().leads.registerTrial(trialInput)).rejects.toThrow("already exists");
  });

  it("rejects invalid email and number of PCs", async () => {
    await expect(caller().leads.registerTrial({ ...trialInput, email: "not-an-email" })).rejects.toThrow();
    await expect(caller().leads.registerTrial({ ...trialInput, numberOfPcs: 0 })).rejects.toThrow();
    await expect(caller().leads.registerTrial({ ...trialInput, numberOfPcs: 1.5 })).rejects.toThrow();
  });

  it("submits a valid sales inquiry", async () => {
    const createSpy = vi.spyOn(dbModule, "createSalesInquiry").mockResolvedValue({ id: 4, status: "new" });

    await expect(caller().leads.submitSalesInquiry(salesInput)).resolves.toEqual({ id: 4, status: "new" });
    expect(createSpy).toHaveBeenCalledWith(salesInput);
    expect(emailModule.notifyLeadInBackground).toHaveBeenCalledWith({ type: "sales", lead: salesInput });
  });

  it("rejects missing sales fields and an excessively long message", async () => {
    await expect(caller().leads.submitSalesInquiry({ ...salesInput, message: "" })).rejects.toThrow();
    await expect(caller().leads.submitSalesInquiry({ ...salesInput, message: "x".repeat(5001) })).rejects.toThrow();
  });

  it("surfaces database failures", async () => {
    vi.spyOn(dbModule, "createSalesInquiry").mockRejectedValue(new Error("Database unavailable"));

    await expect(caller().leads.submitSalesInquiry(salesInput)).rejects.toThrow("Database unavailable");
    expect(emailModule.notifyLeadInBackground).not.toHaveBeenCalled();
  });
});

describe("admin lead procedures", () => {
  it("allows an admin to list and update both lead types", async () => {
    const trial = [{ id: 1, fullName: "Trial Lead", status: "pending_setup" }];
    const sales = [{ id: 2, fullName: "Sales Lead", status: "new" }];
    const listTrialsSpy = vi.spyOn(dbModule, "listTrialRegistrations").mockResolvedValue(trial as any);
    const listSalesSpy = vi.spyOn(dbModule, "listSalesInquiries").mockResolvedValue(sales as any);
    const updateTrialSpy = vi.spyOn(dbModule, "updateTrialRegistrationStatus").mockResolvedValue({ success: true });
    const updateSalesSpy = vi.spyOn(dbModule, "updateSalesInquiryStatus").mockResolvedValue({ success: true });

    await expect(adminCaller().leads.listTrialRegistrations()).resolves.toEqual(trial);
    await expect(adminCaller().leads.listSalesInquiries()).resolves.toEqual(sales);
    await adminCaller().leads.updateTrialRegistrationStatus({ id: 1, status: "converted" });
    await adminCaller().leads.updateSalesInquiryStatus({ id: 2, status: "contacted" });
    expect(listTrialsSpy).toHaveBeenCalled();
    expect(listSalesSpy).toHaveBeenCalled();
    expect(updateTrialSpy).toHaveBeenCalledWith(1, "converted");
    expect(updateSalesSpy).toHaveBeenCalledWith(2, "contacted");
  });

  it("rejects unauthenticated lead access", async () => {
    await expect(caller().leads.listTrialRegistrations()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().leads.updateSalesInquiryStatus({ id: 1, status: "closed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});