export default function SectionIntro({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.15rem]">{title}</h2>
      <p className="mt-4 text-base leading-8 text-slate-600">{description}</p>
    </div>
  );
}
