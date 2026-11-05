import { SettingsPanel } from "@/components/SettingsPanel";
import { Card } from "@/components/ui";
import { getSettings, getSymbolConfigs, hlNetwork, liveConfigured } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [s, symbols] = await Promise.all([getSettings(), getSymbolConfigs()]);
  return (
    <Card title="Impostazioni">
      <SettingsPanel
        mode={s.mode === "live" ? "live" : "paper"}
        killSwitch={s.killSwitch}
        flags={{
          allowBuyAfterPartial: s.allowBuyAfterPartial,
          multiStagePerBar: s.multiStagePerBar,
          enforceCloseWindow: s.enforceCloseWindow,
        }}
        symbols={symbols.map((x) => ({ coin: x.coin, enabled: x.enabled, unitUsd: x.unitUsd }))}
        liveReady={liveConfigured()}
        network={hlNetwork()}
        secretFromEnv={s.secretFromEnv}
      />
    </Card>
  );
}
