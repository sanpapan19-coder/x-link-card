import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { getCardById } from '@/app/actions/cards';
import EditCardForm from '@/components/admin/EditCardForm';

export const dynamic = 'force-dynamic';

interface EditCardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCardPage({ params }: EditCardPageProps) {
  const { id } = await params;
  const card = await getCardById(id);

  if (!card) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-16 animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center space-y-5">
          <div className="inline-flex p-4 bg-rose-50 text-rose-600 rounded-full">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800">カードが見つかりません</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              指定されたIDのカードは存在しないか、すでに削除された可能性があります。
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/admin/cards"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              カード一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <EditCardForm card={card} />;
}
