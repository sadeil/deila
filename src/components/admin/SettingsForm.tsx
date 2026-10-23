import { saveSettings } from "@/app/admin/actions/system";
import { ActionForm } from "./ActionForm";

/** Server-rendered settings group that posts to the generic, whitelisted settings action. */
export function SettingsForm({ k, children, label }: { k: string; children: React.ReactNode; label: string }) {
  return (
    <ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="_key" value={k} />
      {children}
      <div className="sm:col-span-2"><button className="btn-primary btn-sm h-9">{label}</button></div>
    </ActionForm>
  );
}
