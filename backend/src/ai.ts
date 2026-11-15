/**
 * Sun'iy intellekt yordamchisi: admin kiritgan qisqa buyruq va mahsulot rasmlaridan
 * to'liq mahsulot kartasini (nom, tavsif, 3 tilda tarjima, kategoriya, birlik, narx, qoldiq,
 * yaroqlilik muddati, kafolat, texnik parametrlar) tuzib beradi.
 *
 * Provayder: Google Gemini (standart, AI_PROVIDER=gemini) yoki Claude (AI_PROVIDER=claude).
 * AI faqat qoralama beradi: admin uni formada ko'rib, tahrirlab, keyin saqlaydi.
 * Narx va qoldiq hech qachon o'ylab topilmaydi — faqat admin yozgan yoki rasmda ko'ringan son olinadi.
 */
// @google/genai faqat ESM formatda: CommonJS backend'dan dinamik import bilan yuklanadi
import type { GoogleGenAI, Part } from "@google/genai" with { "resolution-mode": "import" };
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import sharp from "sharp";
// Claude SDK'ning structured-output yordamchisi zod v4 sxemasini kutadi (zod 3.25+ ichida "zod/v4" bor)
import { z } from "zod/v4";
import { config } from "./config";
import { HttpError } from "./errors";

/** Saytda ishlatiladigan o'lchov birliklari (frontend ro'yxati bilan bir xil) */
export const AI_UNITS = ["dona", "quti", "pachka", "o'ram", "juft", "komplekt", "to'plam", "flakon", "litr", "metr", "kg"] as const;

const Tri = z.object({
  uz: z.string().describe("Uzbek (Latin script)"),
  ru: z.string().describe("Russian (Cyrillic)"),
  en: z.string().describe("English"),
});

const SpecSchema = z.object({
  name: z.string().describe("Spec name in Uzbek Latin, e.g. Material"),
  value: z.string().describe("Spec value in Uzbek Latin, e.g. Nitril"),
  nameRu: z.string().describe("Spec name in Russian"),
  valueRu: z.string().describe("Spec value in Russian"),
  nameEn: z.string().describe("Spec name in English"),
  valueEn: z.string().describe("Spec value in English"),
});

/** Model qaytaradigan JSON tuzilmasi (tekshiruv uchun). Hamma maydon majburiy, noma'lum qiymat null bo'ladi. */
export const ProductDraftSchema = z.object({
  name: z.string().nullable().describe("Product name in Uzbek Latin; keep brand/model codes as written"),
  nameRu: z.string().nullable().describe("Product name in Russian (Cyrillic)"),
  nameEn: z.string().nullable().describe("Product name in English"),
  description: z.string().nullable().describe("2-5 sentence buyer-facing description in Uzbek Latin"),
  descriptionRu: z.string().nullable().describe("Same description in natural Russian"),
  descriptionEn: z.string().nullable().describe("Same description in natural English"),
  categorySlug: z.string().nullable().describe("Exactly one slug from the provided category list"),
  brandName: z.string().nullable().describe("Brand / manufacturer; reuse an existing brand spelling when it matches"),
  country: z.string().nullable().describe("Manufacturing country in Uzbek, e.g. Xitoy, Germaniya"),
  unit: z.string().nullable().describe("One of the allowed units"),
  packageQty: z.number().int().nullable().describe("Pieces per box/pack when sold by package, else null"),
  priceFrom: z.number().nullable().describe("Selling price in UZS, only if stated by the admin or visible on a tag"),
  costPrice: z.number().nullable().describe("Purchase (cost) price in UZS, only if stated"),
  stock: z.number().int().nullable().describe("Quantity in stock, only if stated"),
  sku: z.string().nullable().describe("Article / model code, only if given"),
  batchNumber: z.string().nullable().describe("Batch / LOT number if given or legible on packaging"),
  mfdDate: z.string().nullable().describe("Manufacturing date as YYYY-MM-DD if known"),
  expDate: z.string().nullable().describe("Expiry date as YYYY-MM-DD if known (month-only -> last day of month)"),
  warranty: Tri.nullable().describe("Warranty period text in 3 languages, e.g. uz '12 oy rasmiy kafolat'; null when not applicable"),
  specs: z.array(SpecSchema).describe("3-8 relevant technical specs with translations"),
  notes: z.string().describe("1-3 short sentences in Uzbek for the admin: what is missing or should be double-checked"),
});
export type ProductDraft = z.infer<typeof ProductDraftSchema>;

/** Gemini uchun xuddi shu tuzilma standart JSON Schema ko'rinishida (null — ["tur", "null"]) */
const nullable = (type: string, description: string) => ({ type: [type, "null"], description });
const PRODUCT_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: nullable("string", "Product name in Uzbek Latin; keep brand/model codes as written"),
    nameRu: nullable("string", "Product name in Russian (Cyrillic)"),
    nameEn: nullable("string", "Product name in English"),
    description: nullable("string", "2-5 sentence buyer-facing description in Uzbek Latin"),
    descriptionRu: nullable("string", "Same description in natural Russian"),
    descriptionEn: nullable("string", "Same description in natural English"),
    categorySlug: nullable("string", "Exactly one slug from the provided category list"),
    brandName: nullable("string", "Brand / manufacturer; reuse an existing brand spelling when it matches"),
    country: nullable("string", "Manufacturing country in Uzbek, e.g. Xitoy, Germaniya"),
    unit: nullable("string", "One of the allowed units"),
    packageQty: nullable("integer", "Pieces per box/pack when sold by package, else null"),
    priceFrom: nullable("number", "Selling price in UZS, only if stated by the admin or visible on a tag"),
    costPrice: nullable("number", "Purchase (cost) price in UZS, only if stated"),
    stock: nullable("integer", "Quantity in stock, only if stated"),
    sku: nullable("string", "Article / model code, only if given"),
    batchNumber: nullable("string", "Batch / LOT number if given or legible on packaging"),
    mfdDate: nullable("string", "Manufacturing date as YYYY-MM-DD if known"),
    expDate: nullable("string", "Expiry date as YYYY-MM-DD if known (month-only -> last day of month)"),
    warranty: {
      description: "Warranty period text in 3 languages, e.g. uz '12 oy rasmiy kafolat'; null when not applicable",
      anyOf: [
        {
          type: "object",
          properties: {
            uz: { type: "string", description: "Uzbek (Latin script)" },
            ru: { type: "string", description: "Russian (Cyrillic)" },
            en: { type: "string", description: "English" },
          },
          required: ["uz", "ru", "en"],
        },
        { type: "null" },
      ],
    },
    specs: {
      type: "array",
      description: "3-8 relevant technical specs with translations",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Spec name in Uzbek Latin, e.g. Material" },
          value: { type: "string", description: "Spec value in Uzbek Latin, e.g. Nitril" },
          nameRu: { type: "string", description: "Spec name in Russian" },
          valueRu: { type: "string", description: "Spec value in Russian" },
          nameEn: { type: "string", description: "Spec name in English" },
          valueEn: { type: "string", description: "Spec value in English" },
        },
        required: ["name", "value", "nameRu", "valueRu", "nameEn", "valueEn"],
      },
    },
    notes: { type: "string", description: "1-3 short sentences in Uzbek for the admin: what is missing or should be double-checked" },
  },
  required: [
    "name", "nameRu", "nameEn", "description", "descriptionRu", "descriptionEn", "categorySlug", "brandName", "country",
    "unit", "packageQty", "priceFrom", "costPrice", "stock", "sku", "batchNumber", "mfdDate", "expDate", "warranty", "specs", "notes",
  ],
};

const SYSTEM_PROMPT = `You are the product-card assistant for Medax (medax.uz), a store in Namangan, Uzbekistan that sells medical equipment, medical consumables, laboratory reagents, medical furniture and orthopedic products to clinics, pharmacies and private buyers.

The admin sends a short instruction (usually Uzbek, sometimes Russian), optionally photos of the product, its box or label, and the current values of the product form. You return one complete product card as JSON matching the schema.

Language rules
- "name", "description", spec "name"/"value", warranty "uz": Uzbek in LATIN script (o', g', sh, ch; never Cyrillic). Keep brand names and model codes exactly as written (Mindray DC-70, 21G).
- "nameRu", "descriptionRu", spec "nameRu"/"valueRu", warranty "ru": natural Russian in Cyrillic, the way a Russian-language medical catalogue writes it.
- "nameEn", "descriptionEn", spec "nameEn"/"valueEn", warranty "en": natural English.
- Translations must carry the same facts; do not add facts in one language that are missing in another.

Content rules
- name: short commercial name, 3-10 words, e.g. "Steril bir martalik shprits 5 ml (3 komponentli)". No prices, no stock counts inside names or descriptions.
- description: 2-5 sentences for a buyer: what the product is, who uses it, key features, what is in the package. Plain, factual tone. No invented certifications, awards or guarantees.
- categorySlug: choose exactly one slug from the category list in the message. Consumables (syringes, gloves, bandages, catheters) -> consumables category; devices (ultrasound, ECG, monitors) -> equipment; beds, tables, cabinets -> furniture/devices; reagents and test kits -> reagents; wheelchairs, corsets, crutches -> orthopedic.
- brandName: manufacturer or brand when known. If it matches a brand from the provided list (ignoring case), return that exact spelling. Unknown -> null. Never guess a brand.
- country: manufacturing country name in Uzbek (Xitoy, Germaniya, Turkiya, Janubiy Koreya, Yaponiya, Rossiya, AQSH, O'zbekiston, Italiya, Hindiston...). Unknown -> null.
- unit: one of the allowed units. packageQty: pieces inside one box/pack when the product is sold by box or pack, otherwise null.
- priceFrom (selling price), costPrice (purchase price) and stock: ONLY when the admin states them in the instruction or they are clearly visible on a price tag or invoice in the photo. Otherwise null. Never estimate prices or quantities. Amounts are plain numbers in UZS: "1,2 mln" -> 1200000, "850 ming" -> 850000, "45 000 000 so'm" -> 45000000.
- mfdDate / expDate: ISO YYYY-MM-DD when given in the text or legible on the packaging. "EXP 05.2027" or "05/2027" -> "2027-05-31". "MFD 2025-03" -> "2025-03-01". "yaroqlilik 2 yil" together with a manufacturing date -> compute the expiry. Unknown -> null.
- batchNumber: LOT / Partiya / Seriya code if given or legible. Unknown -> null.
- warranty: for devices, equipment, furniture and orthopedic products when the admin states a period or the product obviously carries one. Normalise periods: "3 oy" -> uz "3 oy kafolat", ru "3 месяца гарантии", en "3 months warranty"; "12 oy rasmiy" -> uz "12 oy rasmiy kafolat", ru "12 месяцев официальной гарантии", en "12 months official warranty"; "2 yil" -> uz "2 yil kafolat", ru "2 года гарантии", en "2 years warranty". Use correct Russian plural forms. Consumables and reagents -> null unless the admin states a warranty.
- specs: 3-8 specs that a buyer compares (size, volume, material, sterility, pieces per pack, power supply, screen, max load, dimensions, weight, storage temperature...). Use facts from the instruction and photos first; generally known facts about a clearly identified branded model are acceptable; never invent exact numbers you do not know. Do not duplicate the warranty inside specs.
- sku: only when the admin gives an article or model code.
- notes: 1-3 short sentences in Uzbek Latin addressed to the admin: which important fields could not be determined (e.g. "Narx va qoldiq ko'rsatilmadi.") and anything worth double-checking (e.g. "Yaroqlilik muddati rasmda aniq ko'rinmadi, tekshiring."). If everything is complete, say "Hamma maydon to'ldirildi, tekshirib saqlang."

Merging with the current form
- The message contains the current form values. Keep a current value unless the instruction asks to change it or it is clearly wrong; fill empty fields. Translation fields that are empty should be filled from the Uzbek text.
- mode "translate": do not change Uzbek content or numbers; only produce nameRu, nameEn, descriptionRu, descriptionEn, warranty ru/en and spec translations from the current values. Copy every other field from the current values.
- mode "fill": produce the full card.

Photos
- Read product names, model codes, volumes, sizes, LOT and EXP dates, manufacturer and country from labels. A photo is evidence; do not describe things that are not visible or stated.

Output: return only the JSON object described by the schema, no markdown, no commentary.`;

export interface DraftRequest {
  prompt: string;
  mode: "fill" | "translate";
  current: Record<string, unknown>;
  categories: { slug: string; name: string }[];
  brands: { name: string; country: string | null }[];
  images: Buffer[];
}

export interface DraftResult {
  draft: ProductDraft;
  provider: AiProvider;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

export type AiProvider = "gemini" | "claude";

export function activeProvider(): AiProvider {
  return config.ai.provider;
}

/** Tanlangan provayder uchun kalit kiritilganmi */
export function isAiConfigured(): boolean {
  return activeProvider() === "gemini" ? Boolean(config.ai.geminiApiKey) : Boolean(config.ai.anthropicApiKey);
}

export function aiModelName(): string {
  return activeProvider() === "gemini" ? config.ai.geminiModel : config.ai.anthropicModel;
}

/** .env da qaysi kalit kutilayotgani (xato xabarlari va admin paneldagi eslatma uchun) */
export function aiKeyEnvName(): string {
  return activeProvider() === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
}

/** Rasmni modelga yuborishdan oldin kichraytiramiz (tokenlar va vaqt tejaladi) */
async function prepareImage(buf: Buffer): Promise<string> {
  const out = await sharp(buf, { failOn: "error", limitInputPixels: 120_000_000 })
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return out.toString("base64");
}

function buildUserText(req: DraftRequest): string {
  const categoriesText = req.categories.map((c) => `- ${c.slug}: ${c.name}`).join("\n") || "- (none)";
  const brandsText = req.brands.map((b) => (b.country ? `${b.name} (${b.country})` : b.name)).join(", ") || "(none)";
  return [
    `Mode: ${req.mode}`,
    "",
    "Category list (slug: name):",
    categoriesText,
    "",
    `Existing brands: ${brandsText}`,
    `Allowed units: ${AI_UNITS.join(", ")}`,
    "",
    "Current form values (JSON):",
    JSON.stringify(req.current, null, 0),
    "",
    "Admin instruction:",
    req.prompt.trim() || "(no instruction; use the photos and the current values)",
  ].join("\n");
}

async function prepareImages(images: Buffer[]): Promise<string[]> {
  const out: string[] = [];
  for (const [i, img] of images.slice(0, 3).entries()) {
    try {
      out.push(await prepareImage(img));
    } catch {
      throw new HttpError(400, `${i + 1}-rasm fayli yaroqsiz`);
    }
  }
  return out;
}

/** Model javobidagi matnni JSON sifatida o'qib, sxema bo'yicha tekshiradi */
function parseDraft(text: string): ProductDraft {
  let raw: unknown;
  try {
    // Ba'zi modellar JSON'ni ```json ... ``` ichida qaytaradi
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    raw = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, "AI javobi kutilgan formatda emas. Qayta urinib ko'ring.");
  }
  const parsed = ProductDraftSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[AI draft] schema mismatch:", parsed.error.issues.slice(0, 3));
    throw new HttpError(502, "AI javobi to'liq emas. Qayta urinib ko'ring.");
  }
  return parsed.data;
}

export async function generateProductDraft(req: DraftRequest): Promise<DraftResult> {
  if (!isAiConfigured()) {
    throw new HttpError(503, `Sun'iy intellekt sozlanmagan: serverda ${aiKeyEnvName()} kiritilmagan.`);
  }
  const images = await prepareImages(req.images);
  const userText = buildUserText(req);
  return activeProvider() === "gemini" ? generateWithGemini(images, userText) : generateWithClaude(images, userText);
}

/* ------------------------------- Google Gemini ------------------------------- */

type GenAiModule = typeof import("@google/genai", { with: { "resolution-mode": "import" } });
let genaiModule: Promise<GenAiModule> | null = null;
let gemini: GoogleGenAI | null = null;

async function getGemini(): Promise<{ sdk: GenAiModule; client: GoogleGenAI }> {
  const sdk = await (genaiModule ??= import("@google/genai"));
  if (!gemini) gemini = new sdk.GoogleGenAI({ apiKey: config.ai.geminiApiKey });
  return { sdk, client: gemini };
}

async function generateWithGemini(images: string[], userText: string): Promise<DraftResult> {
  const model = config.ai.geminiModel;
  const { sdk, client } = await getGemini();
  const parts: Part[] = [];
  images.forEach((data, i) => {
    parts.push({ text: `Rasm ${i + 1}:` });
    parts.push(sdk.createPartFromBase64(data, "image/jpeg"));
  });
  parts.push({ text: userText });

  // thinkingLevel faqat Gemini 3 va undan yangi modellarda; eski 2.x modelga yuborilsa xato beradi
  const supportsThinkingLevel = !/^gemini-(1|2)\./.test(model);
  const thinkingLevel = { low: sdk.ThinkingLevel.LOW, medium: sdk.ThinkingLevel.MEDIUM, high: sdk.ThinkingLevel.HIGH }[config.ai.effort];

  let response;
  try {
    response = await client.models.generateContent({
      model,
      contents: sdk.createUserContent(parts),
      config: {
        httpOptions: { timeout: 120_000 },
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: PRODUCT_DRAFT_JSON_SCHEMA,
        maxOutputTokens: 8192,
        temperature: 0.3,
        ...(supportsThinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        // Tibbiy mahsulot tavsiflari (ignalar, dori-darmon, jarrohlik) xavfli kontent deb bloklanmasin
        safetySettings: [
          { category: sdk.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: sdk.HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: sdk.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: sdk.HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: sdk.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: sdk.HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: sdk.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: sdk.HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });
  } catch (err) {
    if (err instanceof sdk.ApiError) {
      console.error("[AI draft] Gemini API error", err.status, err.message.slice(0, 300));
      // Google noto'g'ri kalitni 400 INVALID_ARGUMENT bilan ham qaytaradi
      if (err.status === 401 || err.status === 403 || /API key not valid|API_KEY_INVALID/i.test(err.message)) {
        throw new HttpError(503, "Gemini kaliti (GEMINI_API_KEY) noto'g'ri yoki ruxsati yo'q.");
      }
      if (err.status === 404) throw new HttpError(503, `Gemini modeli topilmadi: GEMINI_MODEL=${model} qiymatini tekshiring.`);
      if (err.status === 429) throw new HttpError(429, "Gemini limiti tugadi (bepul tarifda daqiqasiga cheklov bor). Bir daqiqadan keyin qayta urinib ko'ring.");
      if (err.status === 400) throw new HttpError(502, "Gemini so'rovni qabul qilmadi. Rasmni kichikroq qilib yoki buyruqni qisqartirib ko'ring.");
      throw new HttpError(502, `Gemini xizmati xatosi (${err.status}). Keyinroq urinib ko'ring.`);
    }
    console.error("[AI draft] Gemini connection error", err);
    throw new HttpError(503, "Gemini xizmatiga ulanib bo'lmadi. Server internetini tekshiring.");
  }

  const usage = {
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0),
    cacheReadTokens: response.usageMetadata?.cachedContentTokenCount ?? 0,
  };
  const candidate = response.candidates?.[0];
  console.log(
    `[AI draft] gemini model=${response.modelVersion || model} finish=${candidate?.finishReason || "-"} in=${usage.inputTokens} out=${usage.outputTokens}`
  );

  if (response.promptFeedback?.blockReason) {
    console.warn("[AI draft] Gemini blocked prompt:", response.promptFeedback.blockReason);
    throw new HttpError(400, "AI bu so'rovni bajarishdan bosh tortdi. Buyruqni yoki rasmni o'zgartirib ko'ring.");
  }
  const finish = String(candidate?.finishReason || "");
  if (finish === "MAX_TOKENS") throw new HttpError(502, "AI javobi uzilib qoldi. Qisqaroq buyruq bilan qayta urinib ko'ring.");
  if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "IMAGE_SAFETY", "SPII"].includes(finish)) {
    throw new HttpError(400, "AI bu so'rovni bajarishdan bosh tortdi. Buyruqni yoki rasmni o'zgartirib ko'ring.");
  }

  const text = response.text || "";
  if (!text) throw new HttpError(502, "AI bo'sh javob qaytardi. Qayta urinib ko'ring.");
  return { draft: parseDraft(text), provider: "gemini", model: response.modelVersion || model, usage };
}

/* --------------------------------- Claude ---------------------------------- */

let claude: Anthropic | null = null;
function getClaude(): Anthropic {
  if (!claude) claude = new Anthropic({ apiKey: config.ai.anthropicApiKey, timeout: 120_000, maxRetries: 1 });
  return claude;
}

async function generateWithClaude(images: string[], userText: string): Promise<DraftResult> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  images.forEach((data, i) => {
    content.push({ type: "text", text: `Rasm ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({ type: "text", text: userText });

  let message: Anthropic.Beta.BetaMessage & { parsed_output?: ProductDraft | null };
  try {
    const stream = getClaude().beta.messages.stream({
      model: config.ai.anthropicModel,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // Xavfsizlik klassifikatori so'rovni rad etsa, Anthropic tavsiya qilgan modelda qayta uriniladi
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: config.ai.effort, format: betaZodOutputFormat(ProductDraftSchema) },
      messages: [{ role: "user", content }],
    });
    const final = await stream.finalMessage();
    message = { ...final, parsed_output: (final.parsed_output ?? null) as ProductDraft | null };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new HttpError(503, "Claude kaliti (ANTHROPIC_API_KEY) noto'g'ri yoki bekor qilingan.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, "AI xizmati band. Bir daqiqadan keyin qayta urinib ko'ring.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new HttpError(503, "AI xizmatiga ulanib bo'lmadi. Server internetini tekshiring.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[AI draft] Claude API error", err.status, err.message);
      throw new HttpError(502, `AI xizmati xatosi (${err.status}). Keyinroq urinib ko'ring.`);
    }
    throw err;
  }

  const usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
  };
  console.log(
    `[AI draft] claude model=${message.model} stop=${message.stop_reason} in=${usage.inputTokens} out=${usage.outputTokens} cache=${usage.cacheReadTokens}`
  );

  if (message.stop_reason === "refusal") {
    console.warn("[AI draft] refused:", message.stop_details?.category);
    throw new HttpError(400, "AI bu so'rovni bajarishdan bosh tortdi. Buyruqni boshqacha yozib ko'ring.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new HttpError(502, "AI javobi uzilib qoldi. Qisqaroq buyruq bilan qayta urinib ko'ring.");
  }

  if (message.parsed_output) {
    return { draft: message.parsed_output, provider: "claude", model: message.model, usage };
  }
  const text = message.content.find((b: Anthropic.Beta.BetaContentBlock): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text || "";
  return { draft: parseDraft(text), provider: "claude", model: message.model, usage };
}
