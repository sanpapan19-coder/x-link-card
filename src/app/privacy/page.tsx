import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "プライバシーポリシー | LinkTweet",
  description:
    "LinkTweetにおけるアクセス情報、クリックログ、外部サイトへの移動に関する取り扱いについて説明します。",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          トップへ戻る
        </Link>

        <div className="mt-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">LinkTweet</p>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950">
              プライバシーポリシー
            </h1>
          </div>
        </div>

        <div className="mt-8 space-y-8 text-base leading-8 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-950">取得する情報</h2>
            <p className="mt-3">
              本サイトでは、リンクの動作確認、不正利用防止、利用状況の把握のため、
              アクセス日時、ブラウザ情報、参照元URL、クリック対象のリンク情報などを記録する場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">利用目的</h2>
            <p className="mt-3">
              取得した情報は、リンクの表示や外部サイトへの移動を正常に行うため、
              またクリック状況の確認や不正利用の防止のために利用します。
              個人を直接特定することを目的として利用するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">外部サイトについて</h2>
            <p className="mt-3">
              本サイトのリンクから外部サイトへ移動した後の情報の取り扱いは、
              各外部サイトのプライバシーポリシーや利用規約に従います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">改定について</h2>
            <p className="mt-3">
              本ページの内容は、必要に応じて変更される場合があります。
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
