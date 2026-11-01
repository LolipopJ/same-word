import { useEffect, useState } from "react";

export function InviteStatus({ code }: { code: string }) {
  const [status, setStatus] = useState("正在检查邀请…");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/rooms/${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) setStatus("邀请已就绪，输入展示 ID 后加入房间。");
        else if (response.status === 404)
          setStatus("房间不存在或已失效。请重新创建房间，或使用新的邀请。");
        else setStatus("暂时无法检查邀请，请重新连接后重试。");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus("暂时无法检查邀请，请重新连接后重试。");
      });
    return () => controller.abort();
  }, [code]);
  return (
    <p className="mb-6 alert" role="status">
      {status}
      <a className="link" href="/">
        回到首页
      </a>
    </p>
  );
}
