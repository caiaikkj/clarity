import { useI18n } from '../i18n'
import { GUIDE } from '../i18n/guide'
import { useUi } from '../lib/store'
import { Modal } from './ui'

export const GuideModal = () => {
  const { openModal } = useUi()
  const { t, lang } = useI18n()
  const guide = GUIDE[lang]
  const close = () => openModal(null)

  return (
    <Modal
      title={guide.title}
      subtitle={guide.subtitle}
      onClose={close}
      footer={
        <button type="button" className="btn btn-primary" onClick={close}>
          {t('common.close')}
        </button>
      }
    >
      <div className="space-y-6">
        {guide.sections.map((section, index) => (
          <section key={section.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] text-sky-300">{index + 1}</span>
              {section.title}
            </h3>
            <ul className="space-y-1.5 pl-7 text-sm leading-relaxed text-slate-300">
              {section.items.map((item) => (
                <li key={item} className="list-disc marker:text-slate-500">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="rounded-2xl border border-white/10 bg-black/10 px-3.5 py-3 text-xs leading-relaxed text-slate-400">{guide.footer}</p>
      </div>
    </Modal>
  )
}
