import { translate, type Lang } from './translations'

export const FORMS = ['Tablet', 'Capsule', 'Softgel', 'Gummy', 'Liquid', 'Patch', 'Inhaler', 'Other'] as const

export type FormName = (typeof FORMS)[number]

export const isFormName = (value: string): value is FormName => (FORMS as readonly string[]).includes(value)

export const formLabel = (form: string, lang: Lang) => (isFormName(form) ? translate(lang, `form.${form}`) : form)
