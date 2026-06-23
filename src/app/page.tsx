import Link from "next/link";
import { ArrowRight, Link2, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">LinkTweet</p>
              <p className="mt-1 text-xs text-slate-500">画像付きリンクの確認ページ</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            管理画面
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            移動先を確認してから外部サイトへ進みます
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950 md:text-5xl">
            SNSで共有された画像付きリンクの移動先を確認できます
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
            LinkTweet は、SNS上で共有された画像付きリンクから外部サイトへ移動する前に、
            画像、タイトル、移動先ドメインを確認するためのページです。
            表示内容を確認したうえで、リンク先へ進むことができます。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              管理画面を開く
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#notice"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              注意事項を見る
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-bold text-slate-950">リンクを開く前に確認できること</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">表示画像</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                共有されたリンクに関連する画像を確認できます。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">移動先ドメイン</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                外部サイトへ移動する前に、移動先のドメインを確認できます。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">外部サイトへの移動</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                内容を確認したあと、対象のキャンペーンページや公式ページへ進みます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="notice" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-xl font-bold text-slate-950">ご利用時の注意</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              表示された画像やタイトルと、移動先の内容が一致しているか確認してください。
            </p>
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              不審な内容や心当たりのないリンクは開かないでください。
            </p>
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              外部サイトの内容やサービスは、各移動先サイトの運営者が管理しています。
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-6 text-center text-xs text-slate-500">
        © 2026 LinkTweet
      </footer>
    </main>
  );
}
