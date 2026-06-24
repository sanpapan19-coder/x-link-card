import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";

export const metadata = {
  title: "このサイトについて | LinkTweet",
  description:
    "LinkTweetは、SNSで共有された画像付きリンクから外部サイトへ移動する前に、表示内容と移動先を確認するためのページです。",
};

export default function AboutPage() {
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
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">LinkTweet</p>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950">
              このサイトについて
            </h1>
          </div>
        </div>

        <div className="mt-8 space-y-7 text-base leading-8 text-slate-700">
          <p>
            LinkTweetは、SNSで共有された画像付きリンクから外部サイトへ移動する前に、
            表示画像、タイトル、説明文、移動先ドメインなどを確認するためのページです。
          </p>
          <p>
            共有されたリンクを開いた利用者が、移動先の概要を確認したうえで外部サイトへ進めるようにすることを目的としています。
          </p>
          <p>
            LinkTweet上に表示される画像や説明文は、リンクの内容を確認しやすくするための情報です。
            外部サイトの内容、サービス、キャンペーン、提供条件などは、各移動先サイトの運営者が管理しています。
          </p>
        </div>
      </div>
    </main>
  );
}
