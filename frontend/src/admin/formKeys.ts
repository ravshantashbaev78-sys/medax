import type { KeyboardEvent } from "react";

const SKIP_TYPES = ["submit", "button", "checkbox", "radio", "file", "hidden", "reset", "image"];

/**
 * Forma ichida Enter bosilganda forma saqlanmaydi, kursor keyingi maydonga o'tadi (1C dagidek).
 * Saqlash — "Saqlash" tugmasi yoki Ctrl+Enter bilan. Textarea ichida Enter odatdagidek yangi qator.
 * Ishlatish: <form onSubmit={save} onKeyDown={enterToNextField}>
 */
export function enterToNextField(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  const target = e.target as HTMLElement;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
  if (tag === "INPUT" && SKIP_TYPES.includes((target as HTMLInputElement).type)) return;
  if (tag !== "INPUT" && tag !== "SELECT") return;

  e.preventDefault();
  const form = e.currentTarget;
  if (e.ctrlKey || e.metaKey) {
    form.requestSubmit();
    return;
  }
  // Qidiruv ro'yxati (datalist) bo'lgan maydonda Enter tanlov uchun ishlatiladi: faqat saqlashni to'xtatamiz
  if (tag === "INPUT" && (target as HTMLInputElement).list) return;

  const fields = Array.from(form.querySelectorAll<HTMLElement>("input, select, textarea")).filter((el) => {
    const input = el as HTMLInputElement;
    if (input.disabled || input.readOnly || el.tabIndex < 0) return false;
    if (el.tagName === "INPUT" && SKIP_TYPES.includes(input.type)) return false;
    return el.offsetParent !== null; // ko'rinmaydigan (yig'ilgan bo'limdagi) maydonlar o'tkaziladi
  });
  const next = fields[fields.indexOf(target) + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement && ["text", "number", "search", "tel", "email", ""].includes(next.type)) {
      try {
        next.select();
      } catch {
        /* ba'zi turlarda select() yo'q */
      }
    }
  }
}
