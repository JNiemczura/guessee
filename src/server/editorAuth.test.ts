import { afterEach, describe, expect, it } from "vitest";

import {
  EDITOR_COOKIE,
  hasEditorCookie,
  isAlertAuthorized,
  isAuthorizedRequest,
  keyMatches,
} from "./editorAuth";

const KEY = "test-editor-key";

function request(headers: Record<string, string>, url = "https://guessee.test/api/editor/puzzles") {
  return new Request(url, { headers });
}

afterEach(() => {
  delete process.env.GUESSEE_EDITOR_KEY;
  delete process.env.GUESSEE_ALERT_TOKEN;
});

describe("keyMatches", () => {
  it("accepts the configured key and rejects everything else", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(keyMatches(KEY)).toBe(true);
    expect(keyMatches("nope")).toBe(false);
  });

  it("rejects a non-string rather than coercing it", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(keyMatches(undefined)).toBe(false);
    expect(keyMatches(12345)).toBe(false);
    expect(keyMatches(["test-editor-key"])).toBe(false);
  });
});

describe("hasEditorCookie", () => {
  it("finds the editor cookie among others", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(hasEditorCookie(`theme=dark; ${EDITOR_COOKIE}=${KEY}; other=1`)).toBe(true);
  });

  it("does not match a cookie whose name merely ends with the same text", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(hasEditorCookie(`not_${EDITOR_COOKIE}=${KEY}`)).toBe(false);
  });

  it("rejects a wrong value, a missing header, and junk", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(hasEditorCookie(`${EDITOR_COOKIE}=wrong`)).toBe(false);
    expect(hasEditorCookie(null)).toBe(false);
    expect(hasEditorCookie(undefined)).toBe(false);
    expect(hasEditorCookie("")).toBe(false);
    expect(hasEditorCookie("no-equals-sign")).toBe(false);
  });

  it("handles a value that is url-encoded", () => {
    process.env.GUESSEE_EDITOR_KEY = "key with spaces";
    expect(hasEditorCookie(`${EDITOR_COOKIE}=key%20with%20spaces`)).toBe(true);
  });
});

describe("isAuthorizedRequest", () => {
  it("is synchronous, so a forgotten await is not expressible", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(typeof isAuthorizedRequest(request({}))).toBe("boolean");
  });

  it("accepts a valid header", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAuthorizedRequest(request({ "x-editor-key": KEY }))).toBe(true);
  });

  it("accepts a valid session cookie", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAuthorizedRequest(request({ cookie: `${EDITOR_COOKIE}=${KEY}` }))).toBe(true);
  });

  it("rejects an anonymous request", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAuthorizedRequest(request({}))).toBe(false);
    expect(isAuthorizedRequest(request({ "x-editor-key": "guess" }))).toBe(false);
    expect(isAuthorizedRequest(request({ cookie: "theme=dark" }))).toBe(false);
  });
});

describe("isAlertAuthorized", () => {
  it("accepts the editor key as a header or a query parameter", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAlertAuthorized(request({ "x-guessee-key": KEY }))).toBe(true);
    expect(isAlertAuthorized(request({}, `https://guessee.test/api/alerts/coverage?key=${KEY}`))).toBe(
      true,
    );
  });

  it("accepts a separate alert token when one is configured", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    process.env.GUESSEE_ALERT_TOKEN = "alert-token";
    expect(isAlertAuthorized(request({ "x-guessee-key": "alert-token" }))).toBe(true);
  });

  it("refuses everything when no alert token is configured", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAlertAuthorized(request({ "x-guessee-key": "anything" }))).toBe(false);
  });

  it("refuses an anonymous request", () => {
    process.env.GUESSEE_EDITOR_KEY = KEY;
    expect(isAlertAuthorized(request({}))).toBe(false);
  });
});
