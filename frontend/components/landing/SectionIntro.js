export default function SectionIntro({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <span className="inline-flex rounded-full border border-[#cfe0d7] bg-white/88 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#0f7a5f]">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0d1f1b] md:text-[2.45rem] md:leading-[1.08]">{title}</h2>
      <p className="mt-4 text-base leading-8 text-[#5c6f68]">{description}</p>
    </div>
  );
}
