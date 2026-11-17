/**
 * Qidiruv uchun matnni bir xil ko'rinishga keltiradi:
 * - kirill harflari lotinchaga (шприц -> shprits, қўлқоп -> qolqop);
 * - barcha apostroflar (' ‘ ’ ʻ ʼ `) olib tashlanadi: ko'rik = ko‘rik = korik;
 * - katta-kichik harf, ortiqcha bo'shliq farqi yo'qoladi.
 */
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export function normalizeSearch(input: string): string {
  let s = (input || "").toLowerCase().replace(/[ʻʼ‘’`´']/g, "");
  s = Array.from(s).map((ch) => (CYR[ch] !== undefined ? CYR[ch] : ch)).join("");
  // "ц" -> ts, lekin lotincha yozuvda ko'pincha "s" yoki "c" ishlatiladi: shprits = shpric = shpris
  s = s.replace(/ts\b/g, "s").replace(/c/g, "s").replace(/ts/g, "s");
  return s.replace(/\s+/g, " ").trim();
}

/** Har bir so'z (har qanday tartibda) nom yoki artikul ichida bo'lsa mos keladi */
export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const h = normalizeSearch(haystack);
  return q.split(" ").every((w) => h.includes(w));
}
