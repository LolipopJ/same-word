export function normalizeText(raw: string): { text: string; key: string } {
  if (/[\p{Cc}\p{Zl}\p{Zp}]/u.test(raw))
    throw new Error("不能包含换行或控制字符");
  const text = raw.trim();
  if ([...text].length < 1 || [...text].length > 20)
    throw new Error("请输入 1～20 个字符");
  return { text, key: text.toLowerCase() };
}
