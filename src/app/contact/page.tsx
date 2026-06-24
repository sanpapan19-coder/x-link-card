import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata = {
  title: "お問い合わせ | LinkTweet",
  description: "LinkTweetへのお問い合わせについて案内します。",
};

export default function ContactPage() {
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
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">LinkTweet</p>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950">
              お問い合わせ
            </h1>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="text-base leading-8 text-slate-700">
            お問い合わせ先は現在準備中です。
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            必要な連絡先や受付方法が決まり次第、このページで案内します。
          </p>
        </div>
      </div>
    </main>
  );
}
