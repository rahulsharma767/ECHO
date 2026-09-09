"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { DataSourceProvider } from "@/lib/dataSourceContext";
import { apiDataSource } from "@/lib/apiDataSource";
import { PreferencesProvider } from "@/lib/preferencesContext";
import { AccessibilityWidget } from "@/components/accessibility/AccessibilityWidget";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PreferencesProvider>
      <DataSourceProvider source={apiDataSource}>
        <div className="relative flex h-dvh w-full overflow-hidden bg-[#08090c]">
          {/* Lightweight static telemetry background.
              The animated Squircle layer is intentionally disabled
              for smoother production/demo performance. */}
          <div
            className="pointer-events-none fixed inset-0 z-0"
            aria-hidden="true"
            style={{
              background: `
                radial-gradient(
                  circle at 50% 20%,
                  rgba(99,102,241,0.10),
                  transparent 30%
                ),
                radial-gradient(
                  circle at 85% 70%,
                  rgba(236,72,153,0.05),
                  transparent 28%
                ),
                linear-gradient(
                  180deg,
                  rgba(8,9,12,0.05),
                  rgba(8,9,12,0.92)
                )
              `,
            }}
          />

          <div className="relative z-10 flex h-full w-full">
            <Sidebar />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#08090c]/48 backdrop-blur-[0.5px]">
              {children}
            </main>
          </div>

          <AccessibilityWidget />
        </div>
      </DataSourceProvider>
    </PreferencesProvider>
  );
}