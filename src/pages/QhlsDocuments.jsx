import { GoogleDriveLogo } from '@phosphor-icons/react'
import AppHeader from '../components/AppHeader'

const folderUrl =
  'https://drive.google.com/drive/folders/1nIrjaN-JNkM8mpl4mlgcKr_UuwObMsU9'

export default function QhlsDocuments() {
  return (
    <main className="w-full max-w-full overflow-x-hidden bg-canvas text-ink">
      <AppHeader />

      <section className="relative overflow-hidden pt-28 sm:pt-32">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            QHLS · Docs
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            QHLS documents
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary">
            Study materials, notices, and other documents from Quran Hadees
            Learning School, kept together in one place.
          </p>

          <a
            href={folderUrl}
            target="_blank"
            rel="noreferrer"
            className="group mt-10 flex max-w-xl flex-col rounded-3xl border border-line bg-surface p-8 transition-transform duration-500 ease-out hover:scale-[1.02]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-500 group-hover:-translate-y-1">
              <GoogleDriveLogo className="h-7 w-7" weight="fill" />
            </span>
            <span className="mt-6 font-display text-2xl font-bold tracking-tight text-ink">
              Open the QHLS folder
            </span>
            <span className="mt-2 text-sm leading-relaxed text-ink-secondary">
              All documents are hosted on Google Drive. The link opens a new
              tab with the complete collection.
            </span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Drive folder
              <span className="inline-block rounded-md border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink-secondary transition-colors duration-200 group-hover:border-primary/40">
                open in new tab ↗
              </span>
            </span>
          </a>
        </div>
      </section>
    </main>
  )
}