import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const anonWork = {
  messages: [{ id: "1", role: "user", content: "Hello" }],
  fileSystemData: { "/App.jsx": { type: "file", content: "<div/>" } },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signIn", () => {
  test("sets isLoading during request and resets after", async () => {
    let resolveSignIn!: (v: any) => void;
    const pendingSignIn = new Promise((res) => { resolveSignIn = res; });
    (signInAction as any).mockReturnValue(pendingSignIn);

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("a@b.com", "pass"); });

    // isLoading should be true while the request is in-flight
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: false }); });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the action result on failure", async () => {
    (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("does not call handlePostSignIn when signIn fails", async () => {
    (signInAction as any).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(getAnonWorkData).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("migrates anonymous work and redirects after successful signIn", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "proj-123" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-123");
  });

  test("redirects to most recent project when no anon work", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([{ id: "existing-proj" }, { id: "older-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  test("creates new project when no anon work and no existing projects", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("New Design #"),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/new-proj");
  });

  test("skips anon work migration when messages array is empty", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
    (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  test("resets isLoading even when signIn throws", async () => {
    (signInAction as any).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signUp", () => {
  test("sets isLoading during request and resets after", async () => {
    let duringLoading = false;
    (signUpAction as any).mockImplementation(async () => {
      duringLoading = true;
      return { success: false };
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(duringLoading).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test("returns the action result on failure", async () => {
    (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("exists@b.com", "password");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  test("does not navigate when signUp fails", async () => {
    (signUpAction as any).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "password");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("migrates anonymous work after successful signUp", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "new-user-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/new-user-proj");
  });

  test("creates new project for new user with no anon work", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "fresh-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/fresh-proj");
  });

  test("resets isLoading even when signUp throws", async () => {
    (signUpAction as any).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@b.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
