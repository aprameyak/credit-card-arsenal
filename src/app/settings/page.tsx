"use client";

import { useState } from "react";
import {
  Button,
  PageHeader,
  Panel,
} from "@/components/ui";
import { useArsenalStore } from "@/lib/store";
import type { Complexity } from "@/lib/types";
import Link from "next/link";

export default function SettingsPage() {
  const profile = useArsenalStore((s) => s.profile);
  const patchProfile = useArsenalStore((s) => s.patchProfile);
  const resetAll = useArsenalStore((s) => s.resetAll);
  const loadDemo = useArsenalStore((s) => s.loadDemo);
  const [exported, setExported] = useState(false);

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ profile }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arsenal-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Settings"
        title="Guardrails & data"
        description="Local-only profile stored in your browser."
      />

      <Panel className="mb-6 space-y-4 animate-rise" title="Guardrails">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={profile.paysInFull === true}
            onChange={(e) =>
              patchProfile({
                paysInFull: e.target.checked ? true : false,
              })
            }
            className="h-4 w-4 accent-signal"
          />
          <span className="text-sm text-bone">
            I pay statement balances in full each month
          </span>
        </label>
        {profile.paysInFull === false && (
          <p className="text-sm text-danger">
            Carrying a balance typically costs more in interest than rewards
            return. Treat rewards as secondary to paying down debt.
          </p>
        )}

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-bone-dim">
            Discretionary monthly target ($)
          </span>
          <input
            type="number"
            min={0}
            className="field mt-2 max-w-xs"
            value={profile.discretionaryMonthlyTarget ?? ""}
            onChange={(e) =>
              patchProfile({
                discretionaryMonthlyTarget:
                  e.target.value === ""
                    ? null
                    : Math.max(0, Number(e.target.value)),
              })
            }
            placeholder="Optional — used on Buy page"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-bone-dim">
            Complexity preference
          </span>
          <select
            className="field mt-2 max-w-xs"
            value={profile.desiredComplexity}
            onChange={(e) =>
              patchProfile({
                desiredComplexity: e.target.value as Complexity,
              })
            }
          >
            <option value="simple">Simple</option>
            <option value="moderate">Moderate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <p className="text-sm text-bone-muted">
          Point valuations: edit on{" "}
          <Link href="/admin" className="text-signal hover:underline">
            Card editor
          </Link>{" "}
          or during onboarding.
        </p>
      </Panel>

      <Panel className="mb-6 space-y-3 animate-rise" title="Data">
        <Button variant="secondary" onClick={exportJson}>
          Export profile JSON
        </Button>
        {exported && (
          <p className="text-xs text-signal">Download started.</p>
        )}
        <Button variant="secondary" onClick={() => loadDemo()}>
          Load demo wallet
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm("Delete all local Arsenal data?")
            ) {
              resetAll();
            }
          }}
        >
          Reset / delete local data
        </Button>
      </Panel>
    </div>
  );
}
