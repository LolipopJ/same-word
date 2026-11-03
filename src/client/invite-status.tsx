import { useEffect, useState } from "react";

import { useLocale } from "./i18n/locale.js";
import type { Dictionary } from "./i18n/messages.js";

type StatusKey = keyof Pick<
  Dictionary["invite"],
  "checking" | "ready" | "invalid" | "unavailable"
>;

export function InviteStatus({ code }: { code: string }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<StatusKey>("checking");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/rooms/${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) setStatus("ready");
        else if (response.status === 404) setStatus("invalid");
        else setStatus("unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unavailable");
      });
    return () => controller.abort();
  }, [code]);
  return (
    <p className="alert text-sm" role="status">
      {t.invite[status]}
      <a className="btn btn-ghost" href="/">
        {t.invite.backHome}
      </a>
    </p>
  );
}
