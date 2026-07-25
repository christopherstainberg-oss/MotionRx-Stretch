import { EDUCATION_ARTICLES } from "@/data/education";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <GraduationCap className="h-7 w-7 text-brand-600" />
          Education hub
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-700/85">
          Physical therapy concepts, injury prevention, and why routines are dosed like an outpatient
          clinic—not extreme flexibility challenges.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EDUCATION_ARTICLES.map((a) => (
          <article key={a.id} className="card flex flex-col p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {a.category.replace("-", " ")} · {a.readMinutes} min read
            </p>
            <h2 className="mt-1 text-lg font-semibold text-brand-900">{a.title}</h2>
            <p className="mt-2 text-sm text-brand-700/85">{a.summary}</p>
            <div className="mt-4 space-y-3 border-t border-brand-100 pt-4 text-sm leading-relaxed text-brand-800">
              {a.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="card border-dashed p-5 text-sm text-brand-700">
        Want a plan built around your symptoms?{" "}
        <Link href="/assessment" className="font-semibold text-brand-800 underline">
          Start the Assessment
        </Link>
        .
      </div>
    </div>
  );
}
