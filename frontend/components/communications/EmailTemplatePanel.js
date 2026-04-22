import { KICKER_CLASS, PANEL_CLASS } from "./constants";

export default function EmailTemplatePanel({ templates, selectedTemplateId, chooseTemplate }) {
  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className={KICKER_CLASS}>Templates</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Email direction</h3>
        </div>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{templates.length} options</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {templates.map((template) => (
          <button key={template.id} type="button" className={`rounded-[22px] border px-4 py-4 text-left transition ${selectedTemplateId === template.id ? "border-[#d7b258] bg-[#fff6e4] shadow-[0_12px_28px_rgba(203,169,82,0.14)]" : "border-[#eadfcd] bg-[#fffaf1] hover:bg-white"}`} onClick={() => chooseTemplate(template)}>
            <strong className="block text-base text-[#060710]">{template.name}</strong>
            <span className="mt-2 block text-sm leading-6 text-[#746853]">{template.subject}</span>
          </button>
        ))}
      </div>
    </article>
  );
}
