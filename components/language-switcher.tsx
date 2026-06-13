'use client'

import { LANGS } from '@/lib/i18n'
import { useLanguage } from '@/contexts/language'
import { SelectButton } from './ui/select-button'

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()
  return (
    <div className="flex items-center gap-0.5">
      {LANGS.map(({ code, label }) => (
        <SelectButton
          key={code}
          active={lang === code}
          onClick={() => setLang(code)}
          className="px-2 py-0.5 text-xs font-medium"
          inactiveClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {label}
        </SelectButton>
      ))}
    </div>
  )
}
