import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallBadge, getLabel } from "../ToolCallBadge";

describe("getLabel", () => {
  it("returns 'Creating <file>' for str_replace_editor create", () => {
    expect(getLabel("str_replace_editor", { command: "create", path: "/components/Card.jsx" })).toBe("Creating Card.jsx");
  });

  it("returns 'Editing <file>' for str_replace_editor str_replace", () => {
    expect(getLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing App.jsx");
  });

  it("returns 'Editing <file>' for str_replace_editor insert", () => {
    expect(getLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
  });

  it("returns 'Viewing <file>' for str_replace_editor view", () => {
    expect(getLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
  });

  it("returns 'Renaming <file>' for file_manager rename", () => {
    expect(getLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming old.jsx");
  });

  it("returns 'Deleting <file>' for file_manager delete", () => {
    expect(getLabel("file_manager", { command: "delete", path: "/components/Button.jsx" })).toBe("Deleting Button.jsx");
  });

  it("falls back to toolName for unknown tools", () => {
    expect(getLabel("unknown_tool", {})).toBe("unknown_tool");
  });
});

describe("ToolCallBadge", () => {
  it("shows label and spinner when not done", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  it("shows label and green dot when done", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "str_replace", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(screen.getByText("Editing App.jsx")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).toBeDefined();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
