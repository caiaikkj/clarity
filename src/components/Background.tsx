export const Background = () => (
  <div aria-hidden className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-obsidian">
    <div className="orb animate-drift1 -left-[10vw] -top-[12vh] h-[55vw] max-h-[620px] w-[55vw] max-w-[620px] bg-sky-400/[0.28]" />
    <div className="orb animate-drift2 -bottom-[18vh] -right-[8vw] h-[60vw] max-h-[700px] w-[60vw] max-w-[700px] bg-indigo-500/[0.32]" />
    <div className="orb animate-drift3 left-[38vw] top-[34vh] h-[34vw] max-h-[420px] w-[34vw] max-w-[420px] bg-sky-500/[0.12]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(9,13,22,0.55)_100%)]" />
  </div>
)
