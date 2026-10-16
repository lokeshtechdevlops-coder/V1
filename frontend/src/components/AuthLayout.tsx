export default function AuthLayout({children}: {children:React.ReactNode}) {
  return <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
    <aside aria-label="Connected hospital technology" className="relative hidden min-h-[700px] overflow-hidden border-r border-sky-100 bg-[#eff6ff] lg:sticky lg:top-0 lg:block lg:h-[100svh] lg:self-start">
      <img src="/images/auth-hospital-tech.png" alt="A modern hospital connected to digital appointments, medical records, pharmacy and secure patient services." fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center"/>
      <div className="absolute inset-x-0 top-0 z-10 px-10 pt-10 xl:px-14 xl:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Intelligent hospital management</p>
        <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight text-slate-900 xl:text-4xl">Connected services.<br/>Better care journeys.</h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">A single workspace for appointments, medical records and AI-assisted hospital services.</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 px-10 pb-8 xl:px-14 xl:pb-10">
        <div className="rounded-xl border border-sky-100 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">Your hospital, working together.</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Manage appointments. Access your permitted records. Find assistance when you need it.</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-sky-800"><span>Appointments</span><span>Secure records</span><span>AI assistance</span></div>
        </div>
      </div>
    </aside>
    <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-20">{children}</section>
  </main>;
}
