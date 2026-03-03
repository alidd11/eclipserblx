import { describe, it, expect } from "vitest";
import {
  reviewSchema,
  forumThreadSchema,
  chatMessageSchema,
  contactFormSchema,
  validateWithSchema,
  isValidationError,
} from "@/lib/validationSchemas";

describe("reviewSchema", () => {
  it("accepts valid review", () => {
    const result = reviewSchema.safeParse({ content: "Great product, love it!", rating: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects short content", () => {
    const result = reviewSchema.safeParse({ content: "Bad", rating: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects rating out of range", () => {
    expect(reviewSchema.safeParse({ content: "This is a valid review", rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ content: "This is a valid review", rating: 6 }).success).toBe(false);
  });

  it("allows optional title", () => {
    const result = reviewSchema.safeParse({ content: "This is a valid review", rating: 3, title: "Nice" });
    expect(result.success).toBe(true);
  });
});

describe("forumThreadSchema", () => {
  it("accepts valid thread", () => {
    const result = forumThreadSchema.safeParse({ title: "Help needed", content: "I need help with something important" });
    expect(result.success).toBe(true);
  });

  it("rejects short title", () => {
    const result = forumThreadSchema.safeParse({ title: "Hi", content: "Valid content here..." });
    expect(result.success).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("accepts valid message", () => {
    expect(chatMessageSchema.safeParse({ message: "Hello!" }).success).toBe(true);
  });

  it("rejects empty message", () => {
    expect(chatMessageSchema.safeParse({ message: "" }).success).toBe(false);
  });
});

describe("contactFormSchema", () => {
  it("accepts valid contact form", () => {
    const result = contactFormSchema.safeParse({
      name: "John",
      email: "john@example.com",
      subject: "Question",
      message: "I have a question about your product",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = contactFormSchema.safeParse({
      name: "John",
      email: "not-an-email",
      subject: "Question",
      message: "I have a question about your product",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateWithSchema", () => {
  it("returns data on success", () => {
    const result = validateWithSchema(chatMessageSchema, { message: "Hi" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe("Hi");
  });

  it("returns error string on failure", () => {
    const result = validateWithSchema(chatMessageSchema, { message: "" });
    expect(result.success).toBe(false);
    if (isValidationError(result)) expect(result.error).toBeTruthy();
  });
});

describe("isValidationError", () => {
  it("returns true for errors", () => {
    const result = validateWithSchema(chatMessageSchema, { message: "" });
    expect(isValidationError(result)).toBe(true);
  });

  it("returns false for success", () => {
    const result = validateWithSchema(chatMessageSchema, { message: "Ok" });
    expect(isValidationError(result)).toBe(false);
  });
});
