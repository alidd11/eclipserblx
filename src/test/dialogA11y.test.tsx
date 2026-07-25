import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { CommandDialog } from "@/components/ui/command";

/**
 * Radix logs accessibility problems via console.warn AND console.error
 * ("`DialogContent` requires a `DialogTitle`" / "Missing `Description` or
 * `aria-describedby={undefined}`"). This suite mounts every dialog primitive
 * variant and asserts nothing matching those messages is logged.
 */

const forbidden = /DialogTitle|aria-describedby|`Description`|Title` for the component/i;

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function assertNoA11yWarnings() {
  for (const spy of [warnSpy, errorSpy]) {
    for (const call of spy.mock.calls) {
      const msg = call.map((c: unknown) => (typeof c === "string" ? c : "")).join(" ");
      expect(msg).not.toMatch(forbidden);
    }
  }
}

describe("dialog primitives — accessible title/description", () => {
  it("Dialog with no title/description does not warn (fallback injected)", () => {
    render(
      <Dialog open>
        <DialogContent>
          <p>body</p>
        </DialogContent>
      </Dialog>,
    );
    assertNoA11yWarnings();
  });

  it("Dialog with real title + description does not warn", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Real title</DialogTitle>
          <DialogDescription>Real description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Real title")).toBeTruthy();
    assertNoA11yWarnings();
  });

  it("Sheet with no title/description does not warn", () => {
    render(
      <Sheet open>
        <SheetContent>
          <p>body</p>
        </SheetContent>
      </Sheet>,
    );
    assertNoA11yWarnings();
  });

  it("Sheet with real title + description does not warn", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Sheet title</SheetTitle>
          <SheetDescription>Sheet desc</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    assertNoA11yWarnings();
  });

  it("AlertDialog with no title/description does not warn", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <p>body</p>
        </AlertDialogContent>
      </AlertDialog>,
    );
    assertNoA11yWarnings();
  });

  it("AlertDialog with real title + description does not warn", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    assertNoA11yWarnings();
  });

  it("Drawer with no title/description does not warn", () => {
    render(
      <Drawer open>
        <DrawerContent>
          <p>body</p>
        </DrawerContent>
      </Drawer>,
    );
    assertNoA11yWarnings();
  });

  it("Drawer with real title + description does not warn", () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Drawer</DrawerTitle>
          <DrawerDescription>Details</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    assertNoA11yWarnings();
  });

  it("CommandDialog does not warn", () => {
    render(
      <CommandDialog open>
        <div>cmd body</div>
      </CommandDialog>,
    );
    assertNoA11yWarnings();
  });
});
