import type { Config } from 'tailwindcss';

/**
 * ADR-UI-002 D2 + saas-tokens §T9 — Tailwind 3.4 config
 * สีจาก CSS variable รูปแบบ HSL channel — รองรับ opacity modifier (bg-primary/90)
 */
const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

export default {
  darkMode: 'selector', // class "dark" บน <html> จาก next-themes (Tailwind ≥3.4.1)
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './lib/ui/**/*.{ts,tsx}',
    './lib/i18n/**/*.{ts,tsx}',
  ],
  corePlugins: { preflight: false }, // ADR-UI-002 D6 — ลบบรรทัดนี้ใน S6 (cutover)
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    fontSize: {
      xs: ['0.8125rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.6' }],
      base: ['1rem', { lineHeight: '1.7' }],
      lg: ['1.125rem', { lineHeight: '1.6' }],
      xl: ['1.25rem', { lineHeight: '1.5' }],
      '2xl': ['1.5rem', { lineHeight: '1.4' }],
      '3xl': ['1.875rem', { lineHeight: '1.35' }],
      '4xl': ['2.25rem', { lineHeight: '1.35' }],
      '5xl': ['3rem', { lineHeight: '1.35' }],
    },
    extend: {
      colors: {
        border: c('border'),
        input: c('input'),
        ring: c('ring'),
        background: c('background'),
        foreground: c('foreground'),
        primary: { DEFAULT: c('primary'), foreground: c('primary-foreground'), muted: c('primary-muted') },
        secondary: { DEFAULT: c('secondary'), foreground: c('secondary-foreground') },
        muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
        accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
        destructive: {
          DEFAULT: c('destructive'),
          foreground: c('destructive-foreground'),
          muted: c('destructive-muted'),
        },
        success: { DEFAULT: c('success'), muted: c('success-muted') },
        warning: { DEFAULT: c('warning'), muted: c('warning-muted') },
        info: { DEFAULT: c('info'), muted: c('info-muted') },
        card: { DEFAULT: c('card'), foreground: c('card-foreground') },
        popover: { DEFAULT: c('popover'), foreground: c('popover-foreground') },
        chart: { 1: c('chart-1'), 2: c('chart-2'), 3: c('chart-3'), 4: c('chart-4'), 5: c('chart-5') },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-plex-thai)', 'Leelawadee UI', 'Tahoma', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      spacing: { topbar: 'var(--topbar-h)', sidebar: 'var(--sidebar-w)' },
      zIndex: { sticky: '10', topbar: '30', drawer: '40', dialog: '50', toast: '60', loader: '70' },
      transitionDuration: {
        instant: '100ms',
        fast: '150ms',
        base: '220ms',
        slow: '400ms',
        progress: '600ms',
        celebrate: '800ms',
        highlight: '1600ms',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0,.4,0,1)',
        move: 'cubic-bezier(.4,0,0,1)',
        exit: 'cubic-bezier(.6,0,.8,.6)',
        hover: 'cubic-bezier(.4,1,.6,1)',
      },
      // §T8 — ย้ายจาก legacy `@keyframes aq-*` (ค่าเดิม) เป็นชื่อไม่มี prefix
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'dialog-in': { from: { opacity: '0', transform: 'scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
        'toast-out': { from: { opacity: '1', transform: 'none' }, to: { opacity: '0', transform: 'translateY(8px)' } },
        'toast-time': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
        highlight: { from: { backgroundColor: 'hsl(var(--primary-muted))' }, to: { backgroundColor: 'transparent' } },
        bump: { from: { transform: 'scale(.9)' }, to: { transform: 'none' } },
        draw: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        'pop-circle': { from: { transform: 'scale(.9)' }, to: { transform: 'none' } },
        spark: {
          '0%': { opacity: '1', transform: 'rotate(var(--a, 0deg)) translateY(-60px)' },
          '100%': { opacity: '0', transform: 'rotate(var(--a, 0deg)) translateY(-88px)' },
        },
      },
      // duration/easing ตามการใช้ใน legacy.css เดิม
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(0,.4,0,1)',
        'fade-in-base': 'fade-in 220ms cubic-bezier(0,.4,0,1)',
        'fade-up': 'fade-up 400ms cubic-bezier(0,.4,0,1) 120ms both',
        'pop-in': 'pop-in 220ms cubic-bezier(0,.4,0,1)',
        'dialog-in': 'dialog-in 220ms cubic-bezier(0,.4,0,1)',
        'toast-in': 'toast-in 220ms cubic-bezier(0,.4,0,1)',
        'toast-out': 'toast-out 150ms cubic-bezier(.6,0,.8,.6) forwards',
        'toast-time': 'toast-time linear forwards',
        highlight: 'highlight 1600ms cubic-bezier(.6,0,.8,.6)',
        bump: 'bump 220ms cubic-bezier(0,.4,0,1)',
        draw: 'draw 500ms cubic-bezier(.4,0,0,1)',
        'pop-circle': 'pop-circle 500ms cubic-bezier(.4,0,0,1)',
        spark: 'spark 800ms cubic-bezier(0,.4,0,1) 1 both',
      },
    },
  },
  plugins: [],
} satisfies Config;
