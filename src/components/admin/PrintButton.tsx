"use client";
export function PrintButton({ label }: { label: string }) {
  return <button onClick={() => window.print()} className="btn-secondary btn-sm mt-2 h-8 print:hidden">{label}</button>;
}
