import { NextResponse } from "next/server";
import { LAB_STATS, LAB_TESTS, LAB_TEST_BY_KEY, interpretLabValue } from "@/data/labs";
import { parseLabContent } from "@/lib/lab-parse";

/**
 * GET: catalog of lab tests
 * POST: parse report text / JSON body { text, fileName?, mimeType?, sex? }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key) {
    const def = LAB_TEST_BY_KEY[key];
    return NextResponse.json({ stats: LAB_STATS, item: def ?? null });
  }
  const category = searchParams.get("category");
  const items = category
    ? LAB_TESTS.filter((t) => t.category === category)
    : LAB_TESTS;
  return NextResponse.json({
    stats: LAB_STATS,
    categories: Array.from(new Set(LAB_TESTS.map((t) => t.category))),
    items,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      fileName?: string;
      mimeType?: string;
      sex?: string;
    };
    const text = body.text || "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "text required", values: [], warnings: ["Empty input"] },
        { status: 400 }
      );
    }
    const parsed = parseLabContent(text, {
      fileName: body.fileName,
      mimeType: body.mimeType,
      sex: body.sex,
    });
    // re-interpret with sex
    const values = parsed.values.map((v) => {
      const def = LAB_TEST_BY_KEY[v.key];
      if (!def) return v;
      const interp = interpretLabValue(def, v.value, body.sex);
      return { ...v, status: interp.status, unit: def.unit };
    });
    return NextResponse.json({
      stats: LAB_STATS,
      ...parsed,
      values,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "parse failed",
        values: [],
        warnings: ["Parse failed"],
      },
      { status: 500 }
    );
  }
}
