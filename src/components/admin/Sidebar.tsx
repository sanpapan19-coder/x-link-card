'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      name: 'ダッシュボード',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin'
    },
    {
      name: 'カード一覧',
      href: '/admin/cards',
      icon: Layers,
      active: pathname === '/admin/cards'
    },
    {
      name: '新規作成',
      href: '/admin/cards/new',
      icon: PlusCircle,
      active: pathname === '/admin/cards/new'
    }
  ];

  return (
    <>
      {/* モバイル用ヘッダー */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">X-Link Card</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-500 hover:text-slate-700 focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* モバイル用ドロワーメニュー */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-64 max-w-sm bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 mb-8 px-2">
                <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-slate-800 tracking-tight">X-Link Card</span>
              </div>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      item.active 
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="border-t border-slate-100 pt-4 px-2">
              <p className="text-xs text-slate-400">Xリンクカード生成ツール v1.0</p>
            </div>
          </div>
        </div>
      )}

      {/* デスクトップ用固定サイドバー */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 px-6 py-8 justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-10 px-2">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 tracking-tight text-lg">X-Link Card</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-0.5">生成ツール</span>
            </div>
          </div>
          <nav className="space-y-1.5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-300 ${
                  item.active 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${item.active ? 'text-white scale-110' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-5 px-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">簡易モード</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">認証なし (Supabase Auth対応可)</p>
        </div>
      </aside>
    </>
  );
}
