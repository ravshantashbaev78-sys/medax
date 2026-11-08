/**
 * O'zbek va Rus tillarida raqamlarni so'zga aylantirish (Сумма прописью)
 * 1C buxgalteriya hujjatlari, hisob-fakturalar va kassa kvitansiyalari uchun.
 */

export function numberToWordsUz(num: number | string | null | undefined): string {
  const n = Number(num);
  if (!n || isNaN(n) || n <= 0) return "nol so'm 00 tiyin";

  const intPart = Math.floor(n);
  const tiyin = Math.round((n - intPart) * 100);

  const units = ["", "bir", "ikki", "uch", "to'rt", "besh", "olti", "yetti", "sakkiz", "to'qqiz"];
  const tens = ["", "o'n", "yigirma", "o'ttiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "to'qson"];
  const scales = ["", "ming", "million", "milliard", "trillion"];

  function tripleToWords(chunk: number): string {
    const res: string[] = [];
    const h = Math.floor(chunk / 100);
    const rem = chunk % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;
    if (h > 0) res.push(units[h] + " yuz");
    if (t > 0) res.push(tens[t]);
    if (u > 0) res.push(units[u]);
    return res.join(" ");
  }

  const parts: string[] = [];
  let current = intPart;
  let scaleIdx = 0;

  while (current > 0) {
    const chunk = current % 1000;
    if (chunk > 0) {
      const chunkWords = tripleToWords(chunk);
      const scaleName = scales[scaleIdx];
      parts.unshift(scaleName ? `${chunkWords} ${scaleName}` : chunkWords);
    }
    current = Math.floor(current / 1000);
    scaleIdx++;
  }

  const uzStr = parts.join(" ").trim();
  const cap = uzStr.charAt(0).toUpperCase() + uzStr.slice(1);
  return `${cap} so'm ${String(tiyin).padStart(2, "0")} tiyin`;
}

export function numberToWordsRu(num: number | string | null | undefined): string {
  const n = Number(num);
  if (!n || isNaN(n) || n <= 0) return "ноль сум 00 тийин";

  const intPart = Math.floor(n);
  const tiyin = Math.round((n - intPart) * 100);

  const onesM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const onesF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = [
    "десять",
    "одиннадцать",
    "двенадцать",
    "тринадцать",
    "четырнадцать",
    "пятнадцать",
    "шестнадцать",
    "семнадцать",
    "восемнадцать",
    "девятнадцать",
  ];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  function getDeclension(val: number, one: string, two: string, five: string): string {
    const abs = Math.abs(val) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
  }

  function chunkToWords(chunk: number, isFeminine: boolean): string {
    const res: string[] = [];
    const h = Math.floor(chunk / 100);
    const rem = chunk % 100;
    if (h > 0) res.push(hundreds[h]);
    if (rem >= 10 && rem <= 19) {
      res.push(teens[rem - 10]);
    } else {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      if (t > 0) res.push(tens[t]);
      if (u > 0) res.push(isFeminine ? onesF[u] : onesM[u]);
    }
    return res.join(" ");
  }

  const parts: string[] = [];
  let current = intPart;

  const scales = [
    { gender: "m", forms: ["сум", "сума", "сум"] },
    { gender: "f", forms: ["тысяча", "тысячи", "тысяч"] },
    { gender: "m", forms: ["миллион", "миллиона", "миллионов"] },
    { gender: "m", forms: ["миллиард", "миллиарда", "миллиардов"] },
  ];

  for (let i = 0; i < scales.length; i++) {
    const chunk = current % 1000;
    if (chunk > 0) {
      const words = chunkToWords(chunk, scales[i].gender === "f");
      const form = getDeclension(chunk, scales[i].forms[0], scales[i].forms[1], scales[i].forms[2]);
      parts.unshift(`${words} ${form}`);
    } else if (i === 0 && current > 0) {
      // In case 0 sum at end (e.g. exactly 15 000 000)
      parts.unshift("сум");
    }
    current = Math.floor(current / 1000);
    if (current === 0) break;
  }

  const ruStr = parts.join(" ").trim();
  const cap = ruStr.charAt(0).toUpperCase() + ruStr.slice(1);
  return `${cap} ${String(tiyin).padStart(2, "0")} тийин`;
}
