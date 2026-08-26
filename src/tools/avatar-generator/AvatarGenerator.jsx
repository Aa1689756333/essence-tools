'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, RefreshCw, User, Image as ImageIcon, Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ALL_AVATAR_STYLES } from '@/lib/all-avatar-styles';
import { useTheme } from '@/shell/ThemeProvider';

const BG_COLORS = [
  'ffdfbf',
  'ffd5dc',
  'd1d4f9',
  'c0aede',
  'b6e3f4',
  'bbf7d0',
  'fef08a',
  'ffb3ba',
  'ffdfba',
  'ffffba',
  'baffc9',
  'bae1ff',
  'e2f0cb',
  'f4e1d2',
  'e6e6fa',
];

const MEME_ADJECTIVES = [
  '脆皮的',
  '发疯的',
  '纯爱的',
  '硬核的',
  '阳光开朗的',
  '佛系的',
  '摆烂的',
  '野生的',
  '离谱的',
  '绝美的',
  '赛博',
  '高段位的',
  '深情的',
  '抽象的',
  'emo的',
  '社恐的',
  '社牛的',
  '退役的',
  '大清早的',
  '深夜的',
  '带薪的',
  '摸鱼的',
  '破防的',
  '上头的',
  '下头的',
  '无语的',
  '搞笑的',
  '倒霉的',
  '无敌的',
  '逆天的',
  '废柴的',
  '超强待机的',
  '秃头的',
  '爆肝的',
  '修仙的',
  '心累的',
  '戏很多的',
  '戏精附体的',
  '卑微的',
  '傲娇的',
  '高冷的',
  '粘人的',
  '双标的',
  '油腻的',
  '猛男必备的',
  '少女心的',
  '耿直的',
  '躺平的',
  '内卷的',
  '划水的',
  '吃瓜的',
  '吃土的',
  '暴富的',
  '非酋的',
  '欧皇的',
  '母胎solo的',
  '史诗级的',
  '传说中的',
  '开挂的',
  '手残的',
  '没心没肺的',
  '懂王的',
  '杠精的',
  '梦幻的',
  '魔幻的',
  '白嫖的',
  '氪金的',
  '量子纠缠的',
  '精致的',
  '土味的',
  '缝合的',
  '降维打击的',
  '真香的',
  '糊涂的',
  '清醒的',
  '微醺的',
  '暴走的',
  '全村希望的',
  '反骨的',
  '纯天然的',
  '高颅顶的',
  '发量惊人的',
  '地中海的',
  '卡皮巴拉式',
  '小镇做题的',
  '顶级拉扯的',
  '先天牛马圣体的',
  '情绪稳定的',
  '极度内耗的',
  '人间清醒的',
  '智商占领高地的',
  '眼里没活的',
  '天生反骨的',
];

const MEME_NOUNS = [
  '吗喽',
  '打工人',
  '老登',
  '哈基米',
  '牛马',
  '大冤种',
  '精神小伙',
  '显眼包',
  '抽象哥',
  '特种兵',
  '散步大爷',
  '键盘侠',
  '吃瓜群众',
  '卷王',
  '鸽子精',
  '复读机',
  '嘤嘤怪',
  '老司机',
  '干饭人',
  '夜猫子',
  '萌新',
  '大佬',
  '卧龙',
  '凤雏',
  '戏精',
  '水军',
  '土豪',
  '直男',
  '海王',
  '老六',
  '咸鱼',
  '锦鲤',
  '柠檬精',
  '工具人',
  '背锅侠',
  '舔狗',
  '单身狗',
  '程序猿',
  '攻城狮',
  '设计狗',
  '运营喵',
  '产品汪',
  '乙方',
  '甲方爸爸',
  '小仙女',
  '普信男',
  '渣男',
  '绿茶',
  '白莲花',
  '键盘政客',
  '懂王',
  '杠精',
  '祖安人',
  '伏地魔',
  '医疗兵',
  'LYB',
  '老阴比',
  '菜鸟',
  '人机',
  '神仙',
  '外挂',
  '喷子',
  '黑粉',
  '真爱粉',
  '死忠粉',
  '颜狗',
  '声控',
  '手控',
  '腿控',
  '吃货',
  '睡神',
  '宅男',
  '宅女',
  '社畜',
  '房奴',
  '车奴',
  '卡奴',
  '月光族',
  '啃老族',
  '斜杠青年',
  '打工魂',
  '干饭魂',
  '八卦党',
  '伸手党',
  '白嫖党',
  '催更党',
  '原神玩家',
  '修仙党',
  '秃头披风侠',
  '天命人',
  '吗喽大王',
  '沸羊羊',
  '双面人',
  '赛博精神病',
  '赛博菩萨',
];

function generateMemeSeed() {
  const adj = MEME_ADJECTIVES[Math.floor(Math.random() * MEME_ADJECTIVES.length)];
  const noun = MEME_NOUNS[Math.floor(Math.random() * MEME_NOUNS.length)];
  return `${adj}${noun}`;
}

function randomPastelHex() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 40) + 60;
  const l = Math.floor(Math.random() * 20) + 75;
  const lNormalized = l / 100;
  const a = (s / 100) * Math.min(lNormalized, 1 - lNormalized);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = lNormalized - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

function formatStyleName(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function AvatarGenerator() {
  const { user, updateUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [style, setStyle] = useState('clay');
  const [seed, setSeed] = useState('');
  const [bgColor, setBgColor] = useState('transparent');
  const [isSettingAvatar, setIsSettingAvatar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (!showColorPicker) return;
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const handleBigRandom = useCallback(() => {
    setSeed(generateMemeSeed());
    setBgColor(randomPastelHex());
  }, []);

  const randomizeSeedOnly = useCallback(() => {
    setSeed(generateMemeSeed());
  }, []);

  const randomizeColorOnly = useCallback(() => {
    setBgColor(randomPastelHex());
  }, []);

  const handleColorPickerChange = useCallback((e) => {
    const hex = e.target.value.replace('#', '');
    setBgColor(hex);
  }, []);

  useEffect(() => {
    handleBigRandom();
  }, [handleBigRandom]);

  const getAvatarUrl = () => {
    const baseUrl = `/api/avatar/${style}/${seed || 'default'}.svg`;
    if (bgColor !== 'transparent') {
      return `${baseUrl}?bg=${bgColor}`;
    }
    return baseUrl;
  };

  const handleDownloadSvg = async () => {
    try {
      const response = await fetch(getAvatarUrl());
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avatar-${style}-${seed}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('SVG 下载成功');
    } catch (err) {
      toast.error('下载失败');
    }
  };

  const handleDownloadPng = async () => {
    try {
      const response = await fetch(getAvatarUrl());
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 512, 512);

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `avatar-${style}-${seed}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('PNG 下载成功');
      };
      img.src = url;
    } catch (err) {
      toast.error('下载失败');
    }
  };

  const handleSetAsAvatar = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      setIsSettingAvatar(true);
      updateUser({ avatarStyle: style, avatarSeed: seed });
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_avatar',
          avatarStyle: style,
          avatarSeed: seed,
        }),
      });

      if (response.ok) {
        toast.success('已成功设为你的头像！');
        await refreshUser();
      } else {
        throw new Error('保存失败');
      }
    } catch (err) {
      toast.error('设置头像失败');
    } finally {
      setIsSettingAvatar(false);
    }
  };

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-4 md:mb-5 lg:mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">头像生成器</h1>
          <p className="text-[13.5px] text-text-secondary leading-relaxed">
            一键生成专属 3D/像素风格头像，支持 {Object.keys(ALL_AVATAR_STYLES).length}{' '}
            种高级样式与自定义背景色。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 左侧设置区 */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-text mb-3">参数配置</h2>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                专属魔法词 (Seed)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="输入任意字符..."
                  className="flex-1 px-3 h-8 bg-bg border border-border rounded-[9px] text-[13px] focus:outline-none focus:border-text-secondary/50 transition-colors text-text"
                />
                <button
                  onClick={randomizeSeedOnly}
                  className="px-3 h-8 bg-card border border-border rounded-[9px] text-text-secondary hover:bg-bg-primary hover:text-text transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="仅随机魔法词"
                >
                  <RefreshCw className="w-[14px] h-[14px]" />
                  <span className="text-[12.5px] font-medium">随机魔法词</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                背景颜色
              </label>
              <div className="flex gap-2 items-start">
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-8 h-8 rounded-full border border-border transition-all cursor-pointer flex-shrink-0 ${bgColor === c ? 'ring-2 ring-offset-2 ring-offset-card ring-text/30 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: `#${c}` }}
                      title={`#${c}`}
                    />
                  ))}

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className={`w-8 h-8 rounded-full border border-border cursor-pointer transition-transform flex-shrink-0 shadow-sm flex items-center justify-center ${(!BG_COLORS.includes(bgColor) && bgColor !== 'transparent') || showColorPicker ? 'scale-110 ring-2 ring-offset-2 ring-offset-card ring-text/30' : 'hover:scale-110'}`}
                      style={{
                        background:
                          !BG_COLORS.includes(bgColor) && bgColor !== 'transparent'
                            ? `#${bgColor}`
                            : 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      }}
                      title="自定义取色器"
                    >
                      {!BG_COLORS.includes(bgColor) && bgColor !== 'transparent' && (
                        <Palette className="w-3.5 h-3.5 text-white mix-blend-difference opacity-70" />
                      )}
                    </button>

                    {showColorPicker && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[100] p-3 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                        <HexColorPicker
                          color={bgColor === 'transparent' ? '#ffffff' : `#${bgColor}`}
                          onChange={(color) => setBgColor(color.replace('#', ''))}
                          style={{ width: '180px', height: '180px' }}
                        />
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-[11px] font-medium text-text-secondary uppercase">
                            HEX: #{bgColor === 'transparent' ? 'ffffff' : bgColor}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={randomizeColorOnly}
                  className="px-3 h-8 bg-card border border-border rounded-[9px] text-text-secondary hover:bg-bg-primary hover:text-text transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="仅随机背景颜色"
                >
                  <RefreshCw className="w-[14px] h-[14px]" />
                  <span className="text-[12.5px] font-medium">随机背景色</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setBgColor('transparent')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all border flex-shrink-0 ${bgColor === 'transparent' ? 'border-text text-text bg-bg-secondary shadow-sm ring-1 ring-text/10' : 'bg-card border-border text-text-secondary hover:bg-bg-primary hover:text-text'}`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-border"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h5v5H0V0zm5 5h5v5H5V5z' fill='%23e5e7eb' fill-rule='evenodd'/%3E%3C/svg%3E\")",
                  }}
                ></div>
                无背景
              </button>

              <button
                onClick={handleBigRandom}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-bg-secondary text-text border border-border hover:bg-bg hover:border-text-secondary/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                全部随机
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col max-h-[300px]">
            <h2 className="text-[14px] font-semibold text-text mb-3">
              所有风格 ({Object.keys(ALL_AVATAR_STYLES).length})
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {Object.keys(ALL_AVATAR_STYLES).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`flex flex-col items-center p-2 rounded-[9px] border cursor-pointer transition-all ${style === s ? 'border-text/30 bg-bg-primary' : 'border-transparent hover:bg-bg-secondary hover:border-border'}`}
                  >
                    <img
                      src={`/api/avatar/${s}/preview.svg`}
                      alt={s}
                      className="w-8 h-8 mb-1.5 rounded-full"
                    />
                    <span className="text-[11px] text-text-secondary w-full truncate text-center leading-tight">
                      {formatStyleName(s)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧预览区 */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div
            className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] rounded-3xl overflow-hidden shadow-lg border border-border flex items-center justify-center relative mb-8 transition-colors"
            style={{
              backgroundColor: bgColor === 'transparent' ? 'transparent' : `#${bgColor}`,
              backgroundImage:
                bgColor === 'transparent'
                  ? "url(\"data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h5v5H0V0zm5 5h5v5H5V5z' fill='%23f3f4f6' fill-rule='evenodd'/%3E%3C/svg%3E\")"
                  : 'none',
            }}
          >
            <img
              src={getAvatarUrl()}
              alt="Avatar Preview"
              className="w-full h-full object-cover scale-[1.02]"
            />
          </div>

          <div className="w-full max-w-[260px] flex flex-col gap-2.5">
            {user && (
              <button
                onClick={handleSetAsAvatar}
                disabled={isSettingAvatar}
                className="w-full flex items-center justify-center gap-2 px-4 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all text-white hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: `0 1px 3px rgba(${theme.shadow}, 0.25)`,
                }}
                onMouseEnter={(e) => {
                  if (!isSettingAvatar) {
                    e.currentTarget.style.backgroundColor = theme.hover;
                    e.currentTarget.style.boxShadow = `0 4px 12px rgba(${theme.shadow}, 0.3)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSettingAvatar) {
                    e.currentTarget.style.backgroundColor = theme.accent;
                    e.currentTarget.style.boxShadow = `0 1px 3px rgba(${theme.shadow}, 0.25)`;
                  }
                }}
              >
                {isSettingAvatar ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                设置为本站头像
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPng}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-[9px] rounded-[9px] text-[12.5px] font-semibold cursor-pointer transition-all bg-bg-secondary text-text border border-border hover:bg-bg-primary hover:border-text-secondary/40"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                下载 PNG
              </button>
              <button
                onClick={handleDownloadSvg}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-[9px] rounded-[9px] text-[12.5px] font-semibold cursor-pointer transition-all bg-bg-secondary text-text border border-border hover:bg-bg-primary hover:border-text-secondary/40"
              >
                <Download className="w-3.5 h-3.5" />
                下载 SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
