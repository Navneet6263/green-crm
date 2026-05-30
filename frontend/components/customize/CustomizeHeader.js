export default function CustomizeHeader() {
  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-gradient-to-br from-white via-[#fffaf1] to-[#fff6e4] p-5 shadow-sm">
      <span className="inline-block mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
        Customization
      </span>
      <h1 className="text-2xl font-bold text-[#060710] lg:text-3xl">
        Customize Your CRM
      </h1>
      <p className="mt-2 text-sm text-[#746853] max-w-2xl">
        Configure lead statuses, form fields, and custom fields to match your business workflow
      </p>
    </div>
  );
}
