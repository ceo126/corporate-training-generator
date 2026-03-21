const fs = require('fs');
const path = require('path');

function generateHTML(data, options = {}) {
  const {
    theme = 'modern',
    title = 'AI 교육',
    watermark = '',
    template = '',
  } = options;

  const themes = {
    modern: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#0a0f1a', slideBg: '#0f172a', text: '#f1f5f9',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed',
      cardBg: 'rgba(37,99,235,0.08)', cardBorder: 'rgba(37,99,235,0.2)',
      glowColor: '37,99,235', isDark: true
    },
    light: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#f0f4f8', slideBg: '#ffffff', text: '#1e293b',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed',
      cardBg: 'rgba(37,99,235,0.05)', cardBorder: 'rgba(37,99,235,0.15)',
      glowColor: '37,99,235', isDark: false
    },
    dark: {
      primary: '#8b5cf6', secondary: '#6d28d9', accent: '#a78bfa',
      bg: '#09090b', slideBg: '#0f172a', text: '#f1f5f9',
      gradientFrom: '#8b5cf6', gradientTo: '#ec4899',
      cardBg: 'rgba(139,92,246,0.08)', cardBorder: 'rgba(139,92,246,0.2)',
      glowColor: '139,92,246', isDark: true
    },
    corporate: {
      primary: '#0f766e', secondary: '#115e59', accent: '#14b8a6',
      bg: '#021a19', slideBg: '#042f2e', text: '#f0fdfa',
      gradientFrom: '#0f766e', gradientTo: '#0284c7',
      cardBg: 'rgba(15,118,110,0.1)', cardBorder: 'rgba(20,184,166,0.2)',
      glowColor: '20,184,166', isDark: true
    },
    warm: {
      primary: '#ea580c', secondary: '#c2410c', accent: '#f97316',
      bg: '#120e0b', slideBg: '#1c1917', text: '#fafaf9',
      gradientFrom: '#ea580c', gradientTo: '#dc2626',
      cardBg: 'rgba(234,88,12,0.08)', cardBorder: 'rgba(249,115,22,0.2)',
      glowColor: '249,115,22', isDark: true
    },
    nature: {
      primary: '#16a34a', secondary: '#15803d', accent: '#4ade80',
      bg: '#052e16', slideBg: '#0a3d1f', text: '#f0fdf4',
      gradientFrom: '#16a34a', gradientTo: '#0d9488',
      cardBg: 'rgba(22,163,74,0.1)', cardBorder: 'rgba(74,222,128,0.2)',
      glowColor: '74,222,128', isDark: true
    },
    tech: {
      primary: '#06b6d4', secondary: '#0891b2', accent: '#22d3ee',
      bg: '#021a2b', slideBg: '#0c2d44', text: '#ecfeff',
      gradientFrom: '#06b6d4', gradientTo: '#8b5cf6',
      cardBg: 'rgba(6,182,212,0.1)', cardBorder: 'rgba(34,211,238,0.2)',
      glowColor: '34,211,238', isDark: true
    },
    elegant: {
      primary: '#a3785f', secondary: '#8b6544', accent: '#d4a574',
      bg: '#1a1410', slideBg: '#231c16', text: '#faf5f0',
      gradientFrom: '#a3785f', gradientTo: '#c9956b',
      cardBg: 'rgba(163,120,95,0.1)', cardBorder: 'rgba(212,165,116,0.2)',
      glowColor: '212,165,116', isDark: true
    },
    creative: {
      primary: '#e040fb', secondary: '#ab47bc', accent: '#f48fb1',
      bg: '#1a0a1e', slideBg: '#250e2a', text: '#fce4ec',
      gradientFrom: '#e040fb', gradientTo: '#ff6e40',
      cardBg: 'rgba(224,64,251,0.1)', cardBorder: 'rgba(244,143,177,0.2)',
      glowColor: '244,143,177', isDark: true
    },
    minimal: {
      primary: '#525252', secondary: '#404040', accent: '#737373',
      bg: '#fafafa', slideBg: '#ffffff', text: '#171717',
      gradientFrom: '#525252', gradientTo: '#737373',
      cardBg: 'rgba(82,82,82,0.05)', cardBorder: 'rgba(82,82,82,0.15)',
      glowColor: '82,82,82', isDark: false
    }
  };

  const t = themes[theme] || themes.modern;
  const slidesHTML = generateSlidesHTML(data, t, options);
  const isDarkDefault = t.isDark;

  return `<!DOCTYPE html>
<html lang="ko" data-theme="${isDarkDefault ? 'dark' : 'light'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');

*{margin:0;padding:0;box-sizing:border-box}

:root{
  --primary:${t.primary};--secondary:${t.secondary};--accent:${t.accent};
  --bg:${t.bg};--slide-bg:${t.slideBg};--text:${t.text};
  --gradient-from:${t.gradientFrom};--gradient-to:${t.gradientTo};
  --card-bg:${t.cardBg};--card-border:${t.cardBorder};--glow:${t.glowColor};
  --nav-bg:rgba(0,0,0,0.4);--nav-text:rgba(255,255,255,0.6);
  --success:#22c55e;--warning:#eab308;--danger:#ef4444;--info:#3b82f6;
}

/* ===== 콘텐츠 가시성 보장 (animation 실패해도 반드시 표시) ===== */
.slide.active .bullet-list li,
.slide.active .card,
.slide.active .step,
.slide.active .stat-item,
.slide.active .col,
.slide.active .tl-item,
.slide.active .checklist li,
.slide.active .quote-mark,
.slide.active .quote-text,
.slide.active .quote-author,
.slide.active .progress-item,
.slide.active .pyramid-level,
.slide.active .ig-item,
.slide.active .donut-item,
.slide.active .matrix-cell,
.slide.active .cycle-node,
.slide.active .chevron,
.slide.active .bar-item,
.slide.active .hl-icon,
.slide.active .hl-main,
.slide.active .hl-sub,
.slide.active .swot-cell,
.slide.active .rm-phase,
.slide.active .comp-side,
.slide.active .funnel-stage,
.slide.active .toc-item,
.slide.active .styled-table,
.slide.active .agenda-item,
.slide.active .image-text-left,
.slide.active .image-text-right{
  opacity:1!important;transform:none!important;
  transition:opacity 0.4s ease, transform 0.4s ease;
}
.slide.active h1,.slide.active h2,
.slide.active .section-num,.slide.active .section-desc,
.slide.active .title-line,.slide.active .accent-line,
.slide.active .subtitle,.slide.active .presenter,
.slide.active .ending-sub,.slide.active .ending-contact,
.slide.active .qr-area,.slide.active .cover-logo,
.slide.active .highlight-box *{
  opacity:1!important;transform:none!important;
  transition:opacity 0.4s ease, transform 0.4s ease;
}
.slide.active .typewriter-text{width:100%!important;transition:width 1s steps(20)}

/* ===== 디자인 템플릿 스타일 ===== */

/* --- template: glass (글래스모피즘) --- */
.tpl-glass .slide-content{backdrop-filter:blur(20px)}
.tpl-glass .card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(12px)}
.tpl-glass .card::before{display:none}
.tpl-glass .card::after{display:none}
.tpl-glass .bullet-list li{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(8px)}
.tpl-glass .slide-content::before{height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.tpl-glass .title-line{display:none}
.tpl-glass .slide-content h2{margin-bottom:40px}
.tpl-glass .step{background:rgba(255,255,255,0.03);border-radius:16px;padding:20px 24px;border:1px solid rgba(255,255,255,0.06)}
.tpl-glass .slide-cover::before,.tpl-glass .slide-cover::after{display:none}
.tpl-glass .toc-item{border:1px solid rgba(255,255,255,0.08);border-radius:16px;backdrop-filter:blur(8px)}

/* --- template: editorial (에디토리얼/매거진) --- */
.tpl-editorial .slide-content{padding:70px 140px 70px 140px}
.tpl-editorial .slide-content h2{font-size:clamp(2.5rem,5vw,4rem);font-weight:900;letter-spacing:-0.04em;font-style:italic}
.tpl-editorial .slide-content::before{display:none}
.tpl-editorial .title-line{width:100%;height:2px;background:var(--card-border);margin-bottom:48px}
.tpl-editorial .bullet-list li{background:none;border:none;border-bottom:1px solid var(--card-border);border-radius:0;padding:20px 8px;backdrop-filter:none}
.tpl-editorial .bullet-icon{border-radius:50%;width:42px;height:42px;min-width:42px}
.tpl-editorial .card{border-radius:4px;border:none;border-bottom:3px solid var(--primary)}
.tpl-editorial .card::before{display:none}
.tpl-editorial .card-icon{border-radius:50%}
.tpl-editorial .step-num{border-radius:50%}
.tpl-editorial .slide-section{text-align:center;align-items:center}
.tpl-editorial .slide-section .section-num{left:50%;right:auto;transform:translateX(-50%);opacity:0.04}
.tpl-editorial .slide-section .section-desc{border-left:none;padding-left:0;font-style:italic}
.tpl-editorial .slide-cover{text-align:center;align-items:center}

/* --- template: geometric (기하학 패턴) --- */
.tpl-geometric .slide-content::before{height:0;border:none}
.tpl-geometric .slide-content::after{
  content:'';position:absolute;top:0;right:0;width:300px;height:300px;
  background:linear-gradient(135deg,rgba(var(--glow),0.08),transparent);
  clip-path:polygon(100% 0,0 0,100% 100%);pointer-events:none;
}
.tpl-geometric .card{border-radius:0;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
.tpl-geometric .card::before{display:none}
.tpl-geometric .bullet-list li{border-radius:0;border-left:4px solid var(--primary);border-top:none;border-right:none;border-bottom:none}
.tpl-geometric .bullet-icon{border-radius:0}
.tpl-geometric .step-num{border-radius:4px}
.tpl-geometric .title-line{width:40px;height:40px;border-radius:0;background:none;border:3px solid var(--accent);margin-bottom:36px}
.tpl-geometric .toc-num{border-radius:4px}
.tpl-geometric .slide-section .section-desc{border-left:4px solid rgba(255,255,255,0.4);border-radius:0}

/* --- template: neon (네온 글로우) --- */
.tpl-neon .slide-content h2{text-shadow:0 0 30px rgba(var(--glow),0.4),0 0 60px rgba(var(--glow),0.2)}
.tpl-neon .card{border:1px solid rgba(var(--glow),0.3);box-shadow:0 0 20px rgba(var(--glow),0.1),inset 0 0 20px rgba(var(--glow),0.03)}
.tpl-neon .card::before{height:2px;box-shadow:0 0 10px rgba(var(--glow),0.5)}
.tpl-neon .bullet-list li{border:1px solid rgba(var(--glow),0.2);box-shadow:0 0 15px rgba(var(--glow),0.05)}
.tpl-neon .bullet-icon{box-shadow:0 0 16px rgba(var(--glow),0.4)}
.tpl-neon .step-num{box-shadow:0 0 24px rgba(var(--glow),0.5)}
.tpl-neon .title-line{box-shadow:0 0 12px rgba(var(--glow),0.5)}
.tpl-neon .slide-content::before{box-shadow:0 0 10px rgba(var(--glow),0.3)}
.tpl-neon .slide-cover h1{text-shadow:0 0 40px rgba(255,255,255,0.5),0 0 80px rgba(var(--glow),0.4)}
.tpl-neon .toc-num{box-shadow:0 0 16px rgba(var(--glow),0.4)}
.tpl-neon .hl-icon{box-shadow:0 0 30px rgba(var(--glow),0.5)}

/* ===== 다크/라이트 모드 ===== */
html[data-theme="light"]{
  --bg:#f0f4f8;--slide-bg:#ffffff;--text:#1e293b;
  --card-bg:rgba(37,99,235,0.05);--card-border:rgba(37,99,235,0.15);
  --nav-bg:rgba(255,255,255,0.85);--nav-text:rgba(0,0,0,0.6);
}

body{font-family:'Noto Sans KR',sans-serif;background:var(--bg);color:var(--text);overflow:hidden;height:100vh}

/* ===== 프레젠테이션 기본 ===== */
.presentation{width:100vw;height:100vh;position:relative;overflow:hidden}

.slide{
  position:absolute;top:0;left:0;width:100%;height:100%;
  display:flex;flex-direction:column;justify-content:center;
  padding:70px 100px;opacity:0;pointer-events:none;
  background:var(--slide-bg);
  transition:opacity 0.7s ease, transform 0.7s cubic-bezier(0.4,0,0.2,1);
  transform:scale(0.95) translateY(30px);
}
.slide[role="tabpanel"]{outline:none}

/* === 전환 효과: fade (기본) === */
.transition-fade .slide{transition:opacity 0.7s ease,transform 0.7s cubic-bezier(0.4,0,0.2,1);transform:scale(0.95) translateY(30px)}
.transition-fade .slide.active{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
.transition-fade .slide.prev{opacity:0;transform:scale(1.02) translateY(-30px)}
/* === 전환 효과: slide (수평) === */
.transition-slide .slide{transition:opacity 0.5s ease,transform 0.6s cubic-bezier(0.4,0,0.2,1);transform:translateX(100%);opacity:0}
.transition-slide .slide.active{opacity:1;transform:translateX(0);pointer-events:auto}
.transition-slide .slide.prev{opacity:0;transform:translateX(-100%)}
/* === 전환 효과: zoom (확대/축소) === */
.transition-zoom .slide{transition:opacity 0.6s ease,transform 0.6s cubic-bezier(0.4,0,0.2,1);transform:scale(0.6);opacity:0}
.transition-zoom .slide.active{opacity:1;transform:scale(1);pointer-events:auto}
.transition-zoom .slide.prev{opacity:0;transform:scale(1.4)}
/* 기본 (fallback) */
.slide.active{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
.slide.prev{opacity:0;transform:scale(1.02) translateY(-30px)}

/* ===== 줌 모드 ===== */
.presentation.zoom-mode .slide.active{transform:scale(1.5);transform-origin:center center;overflow:hidden}

/* ===== 파티클 배경 (표지) ===== */
.particles-container{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:0;pointer-events:none}
.particle{
  position:absolute;border-radius:50%;background:rgba(255,255,255,0.15);
  animation:particleFloat linear infinite;
}
.particle:nth-child(1){width:6px;height:6px;left:10%;animation-duration:12s;animation-delay:0s;top:100%}
.particle:nth-child(2){width:4px;height:4px;left:25%;animation-duration:15s;animation-delay:2s;top:100%}
.particle:nth-child(3){width:8px;height:8px;left:40%;animation-duration:10s;animation-delay:1s;top:100%}
.particle:nth-child(4){width:3px;height:3px;left:55%;animation-duration:18s;animation-delay:3s;top:100%}
.particle:nth-child(5){width:5px;height:5px;left:70%;animation-duration:14s;animation-delay:0.5s;top:100%}
.particle:nth-child(6){width:7px;height:7px;left:85%;animation-duration:11s;animation-delay:4s;top:100%}
.particle:nth-child(7){width:4px;height:4px;left:15%;animation-duration:16s;animation-delay:2.5s;top:100%}
.particle:nth-child(8){width:6px;height:6px;left:50%;animation-duration:13s;animation-delay:1.5s;top:100%}
.particle:nth-child(9){width:3px;height:3px;left:65%;animation-duration:17s;animation-delay:3.5s;top:100%}
.particle:nth-child(10){width:5px;height:5px;left:90%;animation-duration:12s;animation-delay:0.8s;top:100%}
.particle:nth-child(11){width:4px;height:4px;left:5%;animation-duration:14s;animation-delay:5s;top:100%}
.particle:nth-child(12){width:7px;height:7px;left:35%;animation-duration:11s;animation-delay:1.2s;top:100%}
@keyframes particleFloat{
  0%{transform:translateY(0) translateX(0);opacity:0}
  10%{opacity:1}
  90%{opacity:1}
  100%{transform:translateY(-100vh) translateX(40px);opacity:0}
}

/* ===== 표지 ===== */
.slide-cover{
  background:linear-gradient(135deg,var(--gradient-from),var(--gradient-to));
  padding:80px 100px;position:relative;overflow:hidden;
}
.slide-cover::before{
  content:'';position:absolute;top:-20%;right:-10%;width:600px;height:600px;
  background:radial-gradient(circle,rgba(255,255,255,0.08),transparent 60%);border-radius:50%;
}
.slide-cover::after{
  content:'';position:absolute;bottom:-30%;left:-5%;width:500px;height:500px;
  background:radial-gradient(circle,rgba(0,0,0,0.2),transparent 60%);border-radius:50%;
}
.slide-cover h1{
  font-size:clamp(3.2rem,7vw,6rem);font-weight:900;line-height:1.1;
  margin-bottom:20px;z-index:1;letter-spacing:-0.03em;
  opacity:0;transform:translateY(40px);
  text-shadow:0 0 40px rgba(255,255,255,0.3),0 0 80px rgba(255,255,255,0.15);
}
.slide-cover.active h1{animation:coverTitle 1s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide-cover .accent-line{
  width:0;height:5px;background:rgba(255,255,255,0.4);margin:20px 0;
  border-radius:3px;z-index:1;
}
.slide-cover.active .accent-line{animation:lineExpand 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s forwards}
.slide-cover .subtitle{
  font-size:clamp(1.3rem,2.5vw,2.2rem);color:rgba(255,255,255,0.85);z-index:1;
  opacity:0;transform:translateY(20px);
}
.slide-cover.active .subtitle{animation:fadeUp 0.8s ease 0.7s forwards}
.slide-cover .presenter{
  font-size:1.2rem;margin-top:50px;color:rgba(255,255,255,0.5);z-index:1;
  opacity:0;
}
.slide-cover.active .presenter{animation:fadeUp 0.8s ease 1s forwards}

/* ===== 표지 장식 ===== */
.cover-decor{
  position:absolute;right:-50px;top:50%;transform:translateY(-50%);
  width:clamp(300px,35vw,500px);height:clamp(300px,35vw,500px);
  opacity:0.5;z-index:0;pointer-events:none;
}
.cover-decor svg{width:100%;height:100%;animation:coverDecorSpin 60s linear infinite}
@keyframes coverDecorSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* ===== 로고 (표지 우측 상단) ===== */
.cover-logo{
  position:absolute;top:30px;right:40px;z-index:10;
  max-width:120px;max-height:60px;object-fit:contain;
  opacity:0;
}
.slide-cover.active .cover-logo{animation:fadeUp 0.8s ease 0.4s forwards}

/* ===== 워터마크 ===== */
.watermark{
  position:absolute;bottom:60px;right:20px;z-index:2;
  font-size:0.75rem;opacity:0.15;font-weight:600;
  pointer-events:none;letter-spacing:1px;color:var(--text);
}

/* ===== 섹션 구분 ===== */
.slide-section{
  background:linear-gradient(135deg,var(--secondary),var(--primary));
  padding:80px 100px;position:relative;overflow:hidden;
}
.slide-section .section-num{
  font-size:min(22vw,280px);font-weight:900;
  position:absolute;right:60px;bottom:30px;
  opacity:0.12;line-height:1;
  color:rgba(255,255,255,0.2);
}
.slide-section h2{
  font-size:clamp(2.8rem,6vw,4.8rem);font-weight:900;letter-spacing:-0.03em;
  opacity:0;transform:translateX(-60px);
}
.slide-section.active h2{animation:sectionSlideIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide-section .section-desc{
  font-size:clamp(1.2rem,2vw,1.7rem);margin-top:20px;opacity:0;
  color:rgba(255,255,255,0.7);
  border-left:3px solid rgba(255,255,255,0.3);padding-left:20px;
}
.slide-section.active .section-desc{animation:fadeUp 0.7s ease 0.5s forwards}
@keyframes sectionSlideIn{
  from{opacity:0;transform:translateX(-60px);filter:blur(4px)}
  to{opacity:1;transform:translateX(0);filter:blur(0)}
}

/* ===== 그라데이션 텍스트 ===== */
.gradient-text{
  background:linear-gradient(135deg,var(--gradient-from),var(--accent),var(--gradient-to));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}

/* ===== 슬라이드 이미지 ===== */
.slide-image{
  position:absolute;right:60px;top:50%;transform:translateY(-50%);
  width:clamp(200px,22vw,320px);opacity:0.12;pointer-events:none;z-index:0;
}
.slide-image svg{width:100%;height:100%}
.slide-content.has-image{padding-right:clamp(280px,28vw,420px)}
.slide-content.has-image>*{position:relative;z-index:1}
.slide-photo{
  position:absolute;right:60px;top:80px;bottom:80px;
  width:clamp(280px,30vw,420px);border-radius:20px;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,0.3);z-index:0;
  opacity:0;transform:translateX(40px);
}
.slide.active .slide-photo{animation:slideFromRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s forwards}
.slide-photo img{width:100%;height:100%;object-fit:cover}
.slide-content.has-photo{padding-right:clamp(360px,36vw,520px)}
.slide-content.has-photo>*{position:relative;z-index:1}

/* ===== 내용 슬라이드 ===== */
.slide-content{padding:60px 120px 60px 120px;justify-content:center;position:relative;overflow:visible}
.slide-content::before{
  content:'';position:absolute;top:0;left:0;width:100%;height:5px;
  background:linear-gradient(90deg,var(--primary),var(--accent),var(--gradient-to));
}
.slide-content h2{
  font-size:clamp(2.2rem,4vw,3.5rem);font-weight:900;margin-bottom:10px;
  letter-spacing:-0.02em;
  color:var(--primary);
  background:linear-gradient(135deg,var(--primary),var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
@supports not (-webkit-background-clip:text){
  .slide-content h2{color:var(--primary);background:none}
}
.slide-content .title-line{
  width:80px;height:5px;background:linear-gradient(90deg,var(--primary),var(--accent));margin-bottom:44px;border-radius:3px;
}

/* ===== 불릿 ===== */
.bullet-list{list-style:none;padding:0;display:flex;flex-direction:column;gap:20px}
.bullet-list li{
  display:flex;align-items:center;gap:22px;
  font-size:clamp(1.3rem,2.2vw,1.85rem);line-height:1.6;
  padding:22px 32px;border-radius:16px;
  background:var(--card-bg);border:1px solid var(--card-border);
  opacity:0;transform:translateX(-40px);
  backdrop-filter:blur(4px);
}
.slide.active .bullet-list li{animation:slideRight 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .bullet-list li:nth-child(1){animation-delay:0.15s}
.slide.active .bullet-list li:nth-child(2){animation-delay:0.25s}
.slide.active .bullet-list li:nth-child(3){animation-delay:0.35s}
.slide.active .bullet-list li:nth-child(4){animation-delay:0.45s}
.slide.active .bullet-list li:nth-child(5){animation-delay:0.55s}
.slide.active .bullet-list li:nth-child(6){animation-delay:0.65s}
.slide.active .bullet-list li:nth-child(7){animation-delay:0.75s}
.slide.active .bullet-list li:nth-child(8){animation-delay:0.85s}
.num-highlight{
  color:var(--accent);font-weight:800;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  font-size:110%;letter-spacing:-0.02em;
}
@supports not (-webkit-background-clip:text){
  .num-highlight{color:var(--accent);background:none}
}
.bullet-icon{
  width:38px;height:38px;min-width:38px;border-radius:10px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:0.9rem;color:#fff;
}

/* ===== 카드 ===== */
.cards-container{display:flex;gap:24px;flex:1;align-items:stretch;align-content:center}
.card{
  flex:1;border-radius:20px;padding:36px;position:relative;overflow:hidden;
  background:var(--card-bg);border:1px solid var(--card-border);
  backdrop-filter:blur(8px);
  opacity:0;transform:translateY(40px) scale(0.95);
  transition:transform 0.3s ease,box-shadow 0.3s ease;
}
.card:hover{
  transform:translateY(-6px) scale(1) !important;
  box-shadow:0 16px 48px rgba(var(--glow),0.25),0 8px 24px rgba(0,0,0,0.3);
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:4px;
  background:linear-gradient(90deg,var(--primary),var(--accent));
}
.card::after{
  content:'';position:absolute;top:-50px;right:-50px;width:150px;height:150px;
  background:radial-gradient(circle,rgba(var(--glow),0.08),transparent 70%);border-radius:50%;
}
.slide.active .card{animation:cardPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .card:nth-child(1){animation-delay:0.15s}
.slide.active .card:nth-child(2){animation-delay:0.3s}
.slide.active .card:nth-child(3){animation-delay:0.45s}
.slide.active .card:nth-child(4){animation-delay:0.6s}
.card .card-icon{
  width:48px;height:48px;border-radius:12px;margin-bottom:16px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;font-size:1.4rem;
}
.card h3{
  font-size:clamp(1.3rem,2vw,1.7rem);color:var(--primary);
  margin-bottom:14px;font-weight:800;position:relative;z-index:1;
}
.card p,.card li{
  font-size:clamp(1.1rem,1.5vw,1.35rem);line-height:1.7;opacity:0.9;
  position:relative;z-index:1;
}
.card ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:6px}
.card ul li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:10px;vertical-align:middle}

/* ===== 스텝/타임라인 ===== */
.steps-container{display:flex;flex-direction:column;gap:16px;flex:1;justify-content:center;position:relative}
.steps-container::before{
  content:'';position:absolute;left:28px;top:30px;bottom:30px;width:3px;
  background:linear-gradient(to bottom,var(--primary),var(--accent));
  border-radius:2px;opacity:0.4;
}
.step{
  display:flex;align-items:center;gap:24px;
  padding:16px 20px;border-radius:16px;
  opacity:0;transform:translateX(-40px);
  transition:background 0.3s;position:relative;
}
.step:hover{background:var(--card-bg)}
.slide.active .step{animation:slideRight 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .step:nth-child(1){animation-delay:0.15s}
.slide.active .step:nth-child(2){animation-delay:0.3s}
.slide.active .step:nth-child(3){animation-delay:0.45s}
.slide.active .step:nth-child(4){animation-delay:0.6s}
.slide.active .step:nth-child(5){animation-delay:0.75s}
.step-num{
  width:64px;height:64px;min-width:64px;border-radius:18px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:1.2rem;color:#fff;
  box-shadow:0 4px 20px rgba(var(--glow),0.3);
  position:relative;z-index:1;
}
.step-body h4{
  font-size:clamp(1.3rem,2vw,1.7rem);font-weight:800;margin-bottom:6px;
}
.step-body p{
  font-size:clamp(1.1rem,1.5vw,1.3rem);opacity:0.75;
}

/* ===== 목차 인터랙티브 ===== */
.toc-container{display:flex;flex-direction:column;gap:16px;flex:1;justify-content:center;max-width:800px}
.toc-item{
  display:flex;align-items:center;gap:20px;
  padding:16px 24px;border-radius:16px;
  opacity:0;transform:translateX(-40px);
  cursor:pointer;transition:all 0.3s ease;
  border:1px solid transparent;
}
.toc-item:hover{
  background:var(--card-bg);border-color:var(--card-border);
  transform:translateX(8px) !important;
  box-shadow:0 4px 20px rgba(var(--glow),0.15);
}
.slide.active .toc-item{animation:slideRight 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .toc-item:nth-child(1){animation-delay:0.1s}
.slide.active .toc-item:nth-child(2){animation-delay:0.2s}
.slide.active .toc-item:nth-child(3){animation-delay:0.3s}
.slide.active .toc-item:nth-child(4){animation-delay:0.4s}
.slide.active .toc-item:nth-child(5){animation-delay:0.5s}
.slide.active .toc-item:nth-child(6){animation-delay:0.6s}
.slide.active .toc-item:nth-child(7){animation-delay:0.7s}
.slide.active .toc-item:nth-child(8){animation-delay:0.8s}
.toc-num{
  width:48px;height:48px;min-width:48px;border-radius:50%;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:1.1rem;color:#fff;
  box-shadow:0 4px 16px rgba(var(--glow),0.3);
  transition:transform 0.3s ease;
}
.toc-item:hover .toc-num{transform:scale(1.1)}
.toc-title{font-size:clamp(1.3rem,2vw,1.7rem);font-weight:600}
.toc-arrow{margin-left:auto;opacity:0;transform:translateX(-10px);transition:all 0.3s;color:var(--accent);font-size:1.2rem}
.toc-item:hover .toc-arrow{opacity:1;transform:translateX(0)}

/* ===== 2컬럼 비교 ===== */
.two-col{display:flex;gap:20px;flex:1;align-items:stretch}
.col{
  flex:1;padding:28px;border-radius:20px;
  background:var(--card-bg);border:1px solid var(--card-border);
  position:relative;overflow:hidden;
  opacity:0;
}
.col::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.col:first-child::before{background:linear-gradient(90deg,var(--danger),#f97316)}
.col:last-child::before{background:linear-gradient(90deg,var(--success),#14b8a6)}
.slide.active .col:first-child{animation:slideFromLeft 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide.active .col:last-child{animation:slideFromRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards}
.col h3{
  font-size:clamp(1.1rem,1.6vw,1.5rem);font-weight:700;margin-bottom:18px;
  display:flex;align-items:center;gap:10px;
}
.col:first-child h3{color:#f97316}
.col:last-child h3{color:var(--success)}
.col .bullet-list{gap:10px}
.col .bullet-list li{
  font-size:clamp(0.95rem,1.3vw,1.2rem);padding:10px 16px;
  background:transparent;border:none;backdrop-filter:none;
}
.col:first-child .bullet-icon{background:linear-gradient(135deg,var(--danger),#f97316)}
.col:last-child .bullet-icon{background:linear-gradient(135deg,var(--success),#14b8a6)}
.vs-badge{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;
  width:56px;height:56px;border-radius:50%;
  background:var(--slide-bg);border:3px solid var(--card-border);
  display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:1rem;color:var(--accent);
}

/* ===== 숫자 통계 ===== */
.stat-grid{display:flex;gap:30px;flex:1;align-items:center;justify-content:center}
.stat-item{
  text-align:center;flex:1;padding:30px 20px;border-radius:24px;
  background:var(--card-bg);border:1px solid var(--card-border);
  position:relative;overflow:hidden;
  opacity:0;transform:translateY(30px) scale(0.9);
}
.stat-item::before{
  content:'';position:absolute;bottom:0;left:0;right:0;height:4px;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  transform:scaleX(0);transform-origin:left;transition:transform 1.5s cubic-bezier(0.16,1,0.3,1);
}
.slide.active .stat-item::before{transform:scaleX(1)}
.slide.active .stat-item{animation:statPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .stat-item:nth-child(1){animation-delay:0.1s}
.slide.active .stat-item:nth-child(2){animation-delay:0.25s}
.slide.active .stat-item:nth-child(3){animation-delay:0.4s}
.slide.active .stat-item:nth-child(4){animation-delay:0.55s}
.stat-number{
  font-size:clamp(2.5rem,5vw,5rem);font-weight:900;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  display:block;line-height:1.1;
}
.stat-label{font-size:clamp(0.9rem,1.3vw,1.2rem);opacity:0.6;margin-top:8px;display:block}
.stat-ring{width:80px;height:80px;margin:0 auto 12px;position:relative}
.stat-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.stat-ring circle{fill:none;stroke-width:6}
.stat-ring .ring-bg{stroke:var(--card-border)}
.stat-ring .ring-fill{
  stroke:var(--primary);stroke-linecap:round;
  stroke-dasharray:226;stroke-dashoffset:226;
  transition:stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1);
}
.slide.active .stat-ring .ring-fill{stroke-dashoffset:var(--ring-offset,0)}

/* ===== 타임라인 ===== */
.timeline{display:flex;align-items:flex-start;gap:0;flex:1;position:relative;padding-top:30px}
.timeline::before{
  content:'';position:absolute;top:54px;left:40px;right:40px;height:3px;
  background:var(--card-border);border-radius:2px;
}
/* 타임라인 연결선 애니메이션 */
.timeline::after{
  content:'';position:absolute;top:54px;left:40px;right:40px;height:3px;
  background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:2px;
  transform:scaleX(0);transform-origin:left;
}
.slide.active .timeline::after{
  animation:timelineGrow 1.5s cubic-bezier(0.16,1,0.3,1) 0.1s forwards;
}
@keyframes timelineGrow{
  from{transform:scaleX(0)}
  to{transform:scaleX(1)}
}
.tl-item{
  flex:1;text-align:center;position:relative;padding:0 8px;
  opacity:0;transform:translateY(30px);
}
.slide.active .tl-item{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .tl-item:nth-child(1){animation-delay:0.1s}
.slide.active .tl-item:nth-child(2){animation-delay:0.25s}
.slide.active .tl-item:nth-child(3){animation-delay:0.4s}
.slide.active .tl-item:nth-child(4){animation-delay:0.55s}
.slide.active .tl-item:nth-child(5){animation-delay:0.7s}
.slide.active .tl-item:nth-child(6){animation-delay:0.85s}
.tl-dot{
  width:20px;height:20px;border-radius:50%;margin:0 auto 14px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  box-shadow:0 0 20px rgba(var(--glow),0.4);position:relative;z-index:2;
}
.tl-year{font-size:clamp(0.9rem,1.4vw,1.3rem);font-weight:800;color:var(--primary);margin-bottom:8px}
.tl-desc{font-size:clamp(0.8rem,1.1vw,1rem);opacity:0.7;line-height:1.5}

/* ===== 체크리스트 ===== */
.checklist{list-style:none;padding:0;display:flex;flex-direction:column;gap:12px}
.checklist li{
  display:flex;align-items:center;gap:16px;
  font-size:clamp(1rem,1.6vw,1.4rem);line-height:1.5;
  padding:14px 24px;border-radius:14px;
  background:var(--card-bg);border:1px solid var(--card-border);
  opacity:0;transform:translateX(-30px);
}
.slide.active .checklist li{animation:slideRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .checklist li:nth-child(1){animation-delay:0.1s}
.slide.active .checklist li:nth-child(2){animation-delay:0.2s}
.slide.active .checklist li:nth-child(3){animation-delay:0.3s}
.slide.active .checklist li:nth-child(4){animation-delay:0.4s}
.slide.active .checklist li:nth-child(5){animation-delay:0.5s}
.slide.active .checklist li:nth-child(6){animation-delay:0.6s}
.slide.active .checklist li:nth-child(7){animation-delay:0.7s}
.check-icon{
  width:32px;height:32px;min-width:32px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:0.9rem;
}
.check-icon.done{background:linear-gradient(135deg,var(--success),#16a34a);color:#fff;position:relative}
.check-icon.todo{background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);color:transparent}
/* 체크 마크 그리기 애니메이션 (SVG) */
.check-icon.done svg{width:18px;height:18px}
.check-icon.done svg path{
  stroke:#fff;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:24;stroke-dashoffset:24;
}
.slide.active .checklist li:nth-child(1) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.3s forwards}
.slide.active .checklist li:nth-child(2) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.4s forwards}
.slide.active .checklist li:nth-child(3) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.5s forwards}
.slide.active .checklist li:nth-child(4) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.6s forwards}
.slide.active .checklist li:nth-child(5) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.7s forwards}
.slide.active .checklist li:nth-child(6) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.8s forwards}
.slide.active .checklist li:nth-child(7) .check-icon.done svg path{animation:checkDraw 0.4s ease 0.9s forwards}
@keyframes checkDraw{
  from{stroke-dashoffset:24}
  to{stroke-dashoffset:0}
}

/* ===== 인용구 ===== */
.quote-container{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:20px 60px;
}
.quote-mark{
  font-size:clamp(4rem,8vw,8rem);line-height:1;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  opacity:0;transform:scale(0.5);
}
.slide.active .quote-mark{animation:popScale 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s forwards}
.quote-text{
  font-size:clamp(1.3rem,2.5vw,2.2rem);font-weight:500;line-height:1.6;
  font-style:italic;margin:10px 0 30px;opacity:0;
}
.slide.active .quote-text{animation:fadeUp 0.7s ease 0.3s forwards}
.quote-author{
  font-size:clamp(0.9rem,1.3vw,1.2rem);opacity:0;
}
.slide.active .quote-author{animation:fadeUp 0.6s ease 0.6s forwards}

/* ===== 프로그레스 바 ===== */
.progress-list{display:flex;flex-direction:column;gap:20px;flex:1;justify-content:center}
.progress-item{opacity:0;transform:translateX(-30px)}
.slide.active .progress-item{animation:slideRight 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .progress-item:nth-child(1){animation-delay:0.1s}
.slide.active .progress-item:nth-child(2){animation-delay:0.25s}
.slide.active .progress-item:nth-child(3){animation-delay:0.4s}
.slide.active .progress-item:nth-child(4){animation-delay:0.55s}
.slide.active .progress-item:nth-child(5){animation-delay:0.7s}
.progress-header{display:flex;justify-content:space-between;margin-bottom:8px}
.progress-label{font-size:clamp(0.95rem,1.4vw,1.3rem);font-weight:600}
.progress-value{font-size:clamp(0.95rem,1.4vw,1.3rem);font-weight:800;color:var(--primary)}
.progress-track{
  height:12px;border-radius:6px;background:var(--card-bg);
  border:1px solid var(--card-border);overflow:hidden;
}
.progress-fill{
  height:100%;border-radius:6px;width:0;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  transition:width 1.5s cubic-bezier(0.16,1,0.3,1);
}
.slide.active .progress-fill{width:var(--progress-target,0%)}

/* ===== 피라미드 ===== */
.pyramid{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;justify-content:center}
.pyramid-level{
  padding:14px 24px;border-radius:12px;text-align:center;
  background:var(--card-bg);border:1px solid var(--card-border);
  position:relative;opacity:0;transform:translateY(-20px);
}
.slide.active .pyramid-level{animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .pyramid-level:nth-child(1){animation-delay:0.1s}
.slide.active .pyramid-level:nth-child(2){animation-delay:0.25s}
.slide.active .pyramid-level:nth-child(3){animation-delay:0.4s}
.slide.active .pyramid-level:nth-child(4){animation-delay:0.55s}
.slide.active .pyramid-level:nth-child(5){animation-delay:0.7s}
.pyramid-level h4{font-size:clamp(0.95rem,1.5vw,1.3rem);font-weight:700;color:var(--primary)}
.pyramid-level p{font-size:clamp(0.8rem,1.1vw,1rem);opacity:0.6;margin-top:4px}

/* ===== 아이콘 그리드 ===== */
.icon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;flex:1;align-content:center}
.ig-item{
  text-align:center;padding:24px 16px;border-radius:16px;
  background:var(--card-bg);border:1px solid var(--card-border);
  opacity:0;transform:scale(0.9);
}
.slide.active .ig-item{animation:statPop 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .ig-item:nth-child(1){animation-delay:0.05s}
.slide.active .ig-item:nth-child(2){animation-delay:0.15s}
.slide.active .ig-item:nth-child(3){animation-delay:0.25s}
.slide.active .ig-item:nth-child(4){animation-delay:0.35s}
.slide.active .ig-item:nth-child(5){animation-delay:0.45s}
.slide.active .ig-item:nth-child(6){animation-delay:0.55s}
.ig-icon{
  width:56px;height:56px;border-radius:16px;margin:0 auto 12px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-size:1.5rem;color:#fff;
  box-shadow:0 4px 20px rgba(var(--glow),0.25);
}
.ig-title{font-size:clamp(0.95rem,1.3vw,1.15rem);font-weight:700;margin-bottom:6px}
.ig-desc{font-size:clamp(0.8rem,1vw,0.95rem);opacity:0.6;line-height:1.5}

/* ===== 도넛 차트 ===== */
.donut-grid{display:flex;gap:40px;flex:1;align-items:center;justify-content:center;flex-wrap:wrap}
.donut-item{text-align:center;opacity:0;transform:scale(0.8);flex:1;min-width:150px}
.slide.active .donut-item{animation:statPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .donut-item:nth-child(1){animation-delay:0.1s}
.slide.active .donut-item:nth-child(2){animation-delay:0.25s}
.slide.active .donut-item:nth-child(3){animation-delay:0.4s}
.slide.active .donut-item:nth-child(4){animation-delay:0.55s}
.donut-svg{width:clamp(100px,12vw,160px);height:clamp(100px,12vw,160px);margin:0 auto 12px;position:relative}
.donut-svg svg{width:100%;height:100%;transform:rotate(-90deg)}
.donut-svg circle{fill:none;stroke-width:10}
.donut-bg{stroke:var(--card-border)}
.donut-fill{stroke:var(--primary);stroke-linecap:round;stroke-dasharray:314;stroke-dashoffset:314;transition:stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)}
.slide.active .donut-fill{stroke-dashoffset:var(--donut-offset,0)}
.donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:clamp(1.5rem,3vw,2.5rem);font-weight:900;
  background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.donut-label{font-size:clamp(0.85rem,1.2vw,1.1rem);opacity:0.6}

/* ===== 2x2 매트릭스 ===== */
.matrix-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1}
.matrix-cell{
  padding:28px;border-radius:16px;position:relative;overflow:hidden;
  background:var(--card-bg);border:1px solid var(--card-border);
  opacity:0;transform:scale(0.9);
}
.slide.active .matrix-cell{animation:statPop 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .matrix-cell:nth-child(1){animation-delay:0.1s}
.slide.active .matrix-cell:nth-child(2){animation-delay:0.2s}
.slide.active .matrix-cell:nth-child(3){animation-delay:0.3s}
.slide.active .matrix-cell:nth-child(4){animation-delay:0.4s}
.matrix-cell h4{font-size:clamp(1rem,1.5vw,1.3rem);font-weight:700;color:var(--primary);margin-bottom:10px}
.matrix-cell p{font-size:clamp(0.85rem,1.1vw,1rem);opacity:0.7;line-height:1.6}

/* ===== 순환 다이어그램 ===== */
.cycle-container{display:flex;align-items:center;justify-content:center;flex:1;position:relative}
.cycle-ring{position:relative;width:clamp(350px,45vw,500px);height:clamp(350px,45vw,500px)}
/* 점선 화살표 연결선 */
.cycle-svg-arrows{position:absolute;top:0;left:0;width:100%;height:100%;z-index:0}
.cycle-svg-arrows circle{fill:var(--primary);opacity:0}
.slide.active .cycle-svg-arrows circle{animation:cycleDotAppear 0.3s ease forwards}
@keyframes cycleDotAppear{from{opacity:0;r:0}to{opacity:0.4;r:3}}
/* 회전 애니메이션 */
.cycle-orbit{
  position:absolute;top:0;left:0;width:100%;height:100%;
  animation:cycleRotate 20s linear infinite;pointer-events:none;z-index:0;
}
.cycle-orbit-dot{
  position:absolute;width:8px;height:8px;border-radius:50%;
  background:var(--accent);opacity:0.6;
  box-shadow:0 0 10px rgba(var(--glow),0.5);
  top:50%;left:0;transform:translate(-50%,-50%);
}
@keyframes cycleRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.cycle-node{
  position:absolute;width:clamp(100px,14vw,140px);padding:16px;border-radius:16px;
  background:var(--card-bg);border:1px solid var(--card-border);text-align:center;
  transform:translate(-50%,-50%);opacity:0;
  backdrop-filter:blur(8px);z-index:1;
}
.slide.active .cycle-node{animation:statPop 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.cycle-node h4{font-size:clamp(0.85rem,1.2vw,1.1rem);font-weight:700;color:var(--primary)}
.cycle-node p{font-size:clamp(0.7rem,0.9vw,0.85rem);opacity:0.6;margin-top:4px}
.cycle-arrow{position:absolute;font-size:1.5rem;opacity:0.3;color:var(--accent);transform:translate(-50%,-50%)}

/* ===== 쉐브론 프로세스 ===== */
.chevron-container{display:flex;gap:4px;flex:1;align-items:center}
.chevron{
  flex:1;padding:20px 24px 20px 32px;position:relative;text-align:center;
  background:var(--card-bg);clip-path:polygon(0 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,0 100%,20px 50%);
  opacity:0;transform:translateX(-20px);
}
.chevron:first-child{clip-path:polygon(0 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,0 100%);padding-left:24px}
.slide.active .chevron{animation:slideRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .chevron:nth-child(1){animation-delay:0.1s}
.slide.active .chevron:nth-child(2){animation-delay:0.25s}
.slide.active .chevron:nth-child(3){animation-delay:0.4s}
.slide.active .chevron:nth-child(4){animation-delay:0.55s}
.slide.active .chevron:nth-child(5){animation-delay:0.7s}
.chevron h4{font-size:clamp(0.9rem,1.3vw,1.15rem);font-weight:700;color:var(--primary)}
.chevron p{font-size:clamp(0.75rem,1vw,0.9rem);opacity:0.6;margin-top:4px}

/* ===== 막대 차트 ===== */
.bar-chart{display:flex;gap:20px;flex:1;align-items:flex-end;justify-content:center;padding-bottom:40px;position:relative}
.bar-chart::after{content:'';position:absolute;bottom:38px;left:40px;right:40px;height:2px;background:var(--card-border)}
.bar-item{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:100px}
.bar-fill{
  width:100%;border-radius:8px 8px 0 0;min-height:10px;
  background:linear-gradient(to top,var(--primary),var(--accent));
  transform:scaleY(0);transform-origin:bottom;
  transition:transform 1.2s cubic-bezier(0.16,1,0.3,1);
}
.slide.active .bar-fill{transform:scaleY(1)}
.bar-value{font-size:clamp(0.8rem,1.2vw,1.1rem);font-weight:800;color:var(--primary)}
.bar-label{font-size:clamp(0.7rem,1vw,0.9rem);opacity:0.5;text-align:center}

/* ===== 강조 박스 ===== */
.highlight-box{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:40px 100px;position:relative;
}
.highlight-box::before{
  content:'\u201C';position:absolute;top:10%;left:8%;
  font-size:clamp(8rem,15vw,14rem);font-weight:900;line-height:1;
  color:var(--primary);opacity:0.06;pointer-events:none;font-family:Georgia,serif;
}
.hl-icon{
  width:88px;height:88px;border-radius:24px;margin-bottom:28px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-size:2.2rem;color:#fff;
  box-shadow:0 8px 40px rgba(var(--glow),0.3);
  opacity:0;transform:scale(0.5);
}
.slide.active .hl-icon{animation:popScale 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards}
.hl-main{
  font-size:clamp(2rem,3.5vw,3.2rem);font-weight:800;line-height:1.4;
  margin-bottom:20px;opacity:0;letter-spacing:-0.01em;
}
.slide.active .hl-main{animation:fadeUp 0.7s ease 0.3s forwards}
.hl-sub{font-size:clamp(1.1rem,1.6vw,1.4rem);opacity:0;color:rgba(255,255,255,0.5)}
.slide.active .hl-sub{animation:fadeUp 0.6s ease 0.5s forwards}

/* ===== SWOT ===== */
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1}
.swot-cell{
  padding:24px;border-radius:16px;position:relative;overflow:hidden;
  opacity:0;transform:perspective(600px) rotateY(90deg);
  transform-origin:left center;
}
.swot-cell:nth-child(1){background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25)}
.swot-cell:nth-child(2){background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.25)}
.swot-cell:nth-child(3){background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25)}
.swot-cell:nth-child(4){background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25)}
.slide.active .swot-cell{animation:swotFlipIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .swot-cell:nth-child(1){animation-delay:0.1s}
.slide.active .swot-cell:nth-child(2){animation-delay:0.25s}
.slide.active .swot-cell:nth-child(3){animation-delay:0.4s}
.slide.active .swot-cell:nth-child(4){animation-delay:0.55s}
@keyframes swotFlipIn{
  from{opacity:0;transform:perspective(600px) rotateY(90deg)}
  to{opacity:1;transform:perspective(600px) rotateY(0deg)}
}
.swot-cell h4{font-size:clamp(1rem,1.5vw,1.3rem);font-weight:800;margin-bottom:10px}
.swot-cell:nth-child(1) h4{color:var(--success)}
.swot-cell:nth-child(2) h4{color:var(--warning)}
.swot-cell:nth-child(3) h4{color:var(--danger)}
.swot-cell:nth-child(4) h4{color:var(--info)}
.swot-cell ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:4px}
.swot-cell li{font-size:clamp(0.8rem,1.1vw,1rem);opacity:0.8;line-height:1.5}
.swot-cell li::before{content:'\\2022';margin-right:8px;opacity:0.4}

/* ===== 로드맵 ===== */
.roadmap{display:flex;gap:0;flex:1;align-items:stretch;position:relative}
.roadmap::before{content:'';position:absolute;top:50%;left:30px;right:30px;height:4px;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:2px;opacity:0.2;transform:translateY(-50%)}
.rm-phase{
  flex:1;padding:16px;display:flex;flex-direction:column;align-items:center;
  text-align:center;position:relative;opacity:0;transform:translateY(20px);
}
.slide.active .rm-phase{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .rm-phase:nth-child(1){animation-delay:0.1s}
.slide.active .rm-phase:nth-child(2){animation-delay:0.25s}
.slide.active .rm-phase:nth-child(3){animation-delay:0.4s}
.slide.active .rm-phase:nth-child(4){animation-delay:0.55s}
.slide.active .rm-phase:nth-child(5){animation-delay:0.7s}
.rm-dot{width:16px;height:16px;border-radius:50%;background:var(--primary);margin-bottom:12px;box-shadow:0 0 15px rgba(var(--glow),0.4);position:relative;z-index:2}
.rm-card{padding:16px;border-radius:12px;background:var(--card-bg);border:1px solid var(--card-border);width:100%}
.rm-card h4{font-size:clamp(0.85rem,1.2vw,1.05rem);font-weight:700;color:var(--primary);margin-bottom:6px}
.rm-card p{font-size:clamp(0.75rem,1vw,0.9rem);opacity:0.6;line-height:1.5}
.rm-label{font-size:clamp(0.7rem,0.9vw,0.85rem);font-weight:700;opacity:0.4;margin-top:8px}

/* ===== 엔딩 ===== */
.slide-ending{
  background:linear-gradient(135deg,var(--gradient-from),var(--gradient-to));
  align-items:center;text-align:center;position:relative;overflow:hidden;
}
.slide-ending::before{
  content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:500px;height:500px;
  background:radial-gradient(circle,rgba(255,255,255,0.06),transparent 60%);
  border-radius:50%;
}
.slide-ending h2{
  font-size:clamp(3rem,7vw,5.5rem);font-weight:900;color:#fff;z-index:1;
  opacity:0;transform:scale(0.9);
  text-shadow:0 0 60px rgba(255,255,255,0.3);
}
.slide-ending.active h2{animation:popScale 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
/* 타이핑 애니메이션 */
.typewriter-text{
  display:inline-block;border-right:3px solid rgba(255,255,255,0.7);
  white-space:nowrap;overflow:hidden;width:100%;
}
.slide-ending.active .typewriter-text{
  width:0;
  animation:typewriter 1.5s steps(20) 0.5s forwards, blinkCaret 0.7s step-end infinite;
}
@keyframes typewriter{from{width:0}to{width:100%}}
@keyframes blinkCaret{50%{border-color:transparent}}
.ending-contact{
  margin-top:24px;padding:16px 30px;background:rgba(255,255,255,0.08);
  border-radius:12px;backdrop-filter:blur(8px);z-index:1;
  opacity:0;font-size:0.95rem;color:rgba(255,255,255,0.6);
  display:flex;flex-direction:column;gap:4px;
}
.slide-ending.active .ending-contact{animation:fadeUp 0.8s ease 1.2s forwards}
.slide-ending .ending-sub{
  font-size:clamp(1.2rem,2vw,1.8rem);margin-top:24px;opacity:0;color:rgba(255,255,255,0.7);z-index:1;
}
.slide-ending.active .ending-sub{animation:fadeUp 0.8s ease 0.6s forwards}
.slide-ending .qr-area{
  margin-top:30px;padding:20px 30px;background:rgba(255,255,255,0.1);
  border-radius:16px;backdrop-filter:blur(8px);z-index:1;
  opacity:0;font-size:0.95rem;color:rgba(255,255,255,0.7);
  display:flex;flex-direction:column;align-items:center;gap:8px;
}
.slide-ending.active .qr-area{animation:fadeUp 0.8s ease 0.9s forwards}
.qr-area .qr-label{font-weight:700;color:rgba(255,255,255,0.9);font-size:1rem}
.qr-area .qr-url{font-family:monospace;font-size:0.85rem;color:rgba(255,255,255,0.6);word-break:break-all}

/* ===== 네비게이션 ===== */
.nav-bar{
  position:fixed;bottom:0;left:0;right:0;height:50px;
  background:var(--nav-bg);backdrop-filter:blur(12px);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 30px;z-index:100;
}
.nav-bar .progress-bar{
  position:absolute;top:0;left:0;height:3px;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  transition:width 0.5s ease;
}
.nav-btn{
  background:none;border:none;color:var(--nav-text);font-size:0.9rem;
  cursor:pointer;padding:8px 18px;border-radius:8px;transition:all 0.2s;
  font-family:'Noto Sans KR',sans-serif;
}
.nav-btn:hover{background:rgba(var(--glow),0.1);color:var(--text)}
.slide-counter{font-size:0.85rem;opacity:0.5;font-variant-numeric:tabular-nums}
.fullscreen-btn{
  position:fixed;top:15px;right:15px;z-index:101;
  background:rgba(0,0,0,0.3);border:none;color:rgba(255,255,255,0.5);
  width:42px;height:42px;border-radius:10px;cursor:pointer;font-size:1.3rem;
  backdrop-filter:blur(5px);transition:all 0.2s;
}
.fullscreen-btn:hover{background:rgba(0,0,0,0.5);color:#fff}

/* ===== 모드 인디케이터 ===== */
.mode-indicator{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  background:rgba(0,0,0,0.8);color:#fff;padding:12px 28px;border-radius:12px;
  font-size:1rem;font-weight:700;z-index:500;pointer-events:none;
  opacity:0;transition:opacity 0.3s;backdrop-filter:blur(8px);
}
.mode-indicator.visible{opacity:1}

/* ===== 도트 네비게이션 ===== */
.dot-nav{
  position:fixed;left:16px;top:50%;transform:translateY(-50%);z-index:101;
  display:flex;flex-direction:column;gap:8px;
}
.dot-nav-item{
  width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);
  background:transparent;cursor:pointer;transition:all 0.3s;padding:0;
}
.dot-nav-item:hover{border-color:var(--accent);background:rgba(var(--glow),0.3)}
.dot-nav-item.dot-active{background:var(--primary);border-color:var(--primary);transform:scale(1.3)}

/* ===== 키보드 단축키 도움말 ===== */
.help-overlay{
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:400;
  background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);
  display:none;align-items:center;justify-content:center;
}
.help-overlay.visible{display:flex}
.help-content{
  background:var(--slide-bg);border-radius:20px;padding:40px;max-width:560px;width:90%;
  border:1px solid var(--card-border);
}
.help-content h3{
  font-size:1.4rem;font-weight:800;margin-bottom:24px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
}
.help-grid{display:grid;grid-template-columns:auto 1fr;gap:10px 20px;align-items:center}
.help-key{
  padding:4px 12px;border-radius:8px;font-size:0.85rem;font-weight:700;
  background:rgba(var(--glow),0.15);border:1px solid var(--card-border);
  text-align:center;font-family:monospace;
}
.help-desc{font-size:0.95rem;opacity:0.7}
.help-close-hint{margin-top:20px;text-align:center;font-size:0.85rem;opacity:0.4}

/* ===== aria-live ===== */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}

/* ===== comparison ===== */
.comparison-container{display:flex;gap:0;flex:1;align-items:stretch;position:relative}
.comp-side{flex:1;padding:28px;border-radius:20px;background:var(--card-bg);border:1px solid var(--card-border);position:relative;overflow:hidden;opacity:0}
.comp-side::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.comp-side.comp-left::before{background:linear-gradient(90deg,var(--primary),var(--accent))}
.comp-side.comp-right::before{background:linear-gradient(90deg,var(--accent),var(--gradient-to))}
.slide.active .comp-side.comp-left{animation:slideFromLeft 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide.active .comp-side.comp-right{animation:slideFromRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards}
.comp-side h3{font-size:clamp(1.1rem,1.6vw,1.5rem);font-weight:700;margin-bottom:18px;color:var(--primary)}
.comp-side ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:10px}
.comp-side ul li{font-size:clamp(0.95rem,1.3vw,1.2rem);line-height:1.6;padding:8px 14px;border-radius:10px;background:rgba(var(--glow),0.05)}
.comp-side ul li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:10px;vertical-align:middle}
.comp-side{transition:transform 0.3s ease,box-shadow 0.3s ease}
.comp-side:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(var(--glow),0.2)}
.comp-vs-badge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1rem;color:#fff;box-shadow:0 4px 24px rgba(var(--glow),0.4);opacity:0;transform:translate(-50%,-50%) scale(0.5)}
.slide.active .comp-vs-badge{animation:compVsBadge 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s forwards,vsPulse 2s ease-in-out 1.1s infinite}
@keyframes compVsBadge{from{opacity:0;transform:translate(-50%,-50%) scale(0.5)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes vsPulse{0%,100%{box-shadow:0 4px 24px rgba(var(--glow),0.4)}50%{box-shadow:0 4px 36px rgba(var(--glow),0.7),0 0 60px rgba(var(--glow),0.3)}}

/* ===== funnel ===== */
.funnel-container{display:flex;flex-direction:column;align-items:center;gap:0;flex:1;justify-content:center}
.funnel-stage{padding:18px 24px;text-align:center;position:relative;opacity:0;transform:translateY(-20px);border:1px solid var(--card-border);display:flex;align-items:center;justify-content:center;gap:16px;transition:transform 0.3s}
.funnel-stage:first-child{border-radius:16px 16px 0 0}
.funnel-stage:last-child{border-radius:0 0 16px 16px}
.slide.active .funnel-stage{animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .funnel-stage:nth-child(1){animation-delay:0.1s}
.slide.active .funnel-stage:nth-child(2){animation-delay:0.25s}
.slide.active .funnel-stage:nth-child(3){animation-delay:0.4s}
.slide.active .funnel-stage:nth-child(4){animation-delay:0.55s}
.slide.active .funnel-stage:nth-child(5){animation-delay:0.7s}
.funnel-stage h4{font-size:clamp(0.95rem,1.4vw,1.25rem);font-weight:700;color:var(--primary)}
.funnel-stage p{font-size:clamp(0.8rem,1.1vw,1rem);opacity:0.6;margin-top:2px}
.funnel-value{font-size:clamp(1.2rem,2vw,1.8rem);font-weight:900;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;min-width:60px}
.funnel-arrow{width:30px;height:16px;margin:0 auto;opacity:0.3;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:1rem}

/* ===== 발표자 노트 패널 ===== */
.notes-panel{position:fixed;bottom:50px;left:0;right:0;height:180px;background:rgba(0,0,0,0.92);backdrop-filter:blur(12px);z-index:200;padding:16px 30px;overflow-y:auto;border-top:2px solid var(--primary);display:none;flex-direction:column}
.notes-panel.visible{display:flex}
.notes-panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.notes-panel-header span{font-size:0.85rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px}
.notes-panel-close{background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:1.2rem;padding:4px 8px}
.notes-panel-close:hover{color:#fff}
.notes-content{font-size:1rem;line-height:1.7;color:rgba(255,255,255,0.8);flex:1}
.notes-content:empty::before{content:'\\C774 \\C2AC\\B77C\\C774\\B4DC\\C5D0 \\BC1C\\D45C\\C790 \\B178\\D2B8\\AC00 \\C5C6\\C2B5\\B2C8\\B2E4.';opacity:0.4;font-style:italic}

/* ===== 발표 타이머 ===== */
.presentation-timer{position:fixed;bottom:58px;right:20px;z-index:150;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:6px 14px;border-radius:8px;font-size:0.9rem;font-weight:700;color:rgba(255,255,255,0.7);display:none;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.1)}
.presentation-timer.visible{display:flex}
.timer-dot{width:8px;height:8px;border-radius:50%;background:var(--danger)}
.timer-dot.running{animation:timerBlink 1s infinite}
.timer-dot.paused{background:var(--warning)}
@keyframes timerBlink{0%,100%{opacity:1}50%{opacity:0.3}}

/* ===== 썸네일 네비게이터 ===== */
.thumb-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:300;background:rgba(0,0,0,0.9);backdrop-filter:blur(8px);display:none;flex-direction:column;padding:30px}
.thumb-overlay.visible{display:flex}
.thumb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.thumb-header h3{font-size:1.2rem;font-weight:700;color:var(--accent)}
.thumb-close{background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:1.5rem;padding:4px 12px}
.thumb-close:hover{color:#fff}
.thumb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;overflow-y:auto;flex:1;padding-bottom:20px}
.thumb-item{border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.2s;background:var(--slide-bg);position:relative;aspect-ratio:16/9}
.thumb-item:hover{border-color:var(--accent);transform:scale(1.03)}
.thumb-item.thumb-active{border-color:var(--primary);box-shadow:0 0 20px rgba(var(--glow),0.4)}
.thumb-item .thumb-num{position:absolute;top:6px;left:8px;font-size:0.7rem;font-weight:700;background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:4px}
.thumb-item .thumb-title{position:absolute;bottom:0;left:0;right:0;padding:6px 10px;background:linear-gradient(transparent,rgba(0,0,0,0.8));font-size:0.75rem;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ===== 애니메이션 ===== */
@keyframes coverTitle{
  from{opacity:0;transform:translateY(40px);filter:blur(8px)}
  to{opacity:1;transform:translateY(0);filter:blur(0)}
}
@keyframes fadeUp{
  from{opacity:0;transform:translateY(20px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes slideRight{
  from{opacity:0;transform:translateX(-40px)}
  to{opacity:1;transform:translateX(0)}
}
@keyframes slideFromLeft{
  from{opacity:0;transform:translateX(-60px)}
  to{opacity:1;transform:translateX(0)}
}
@keyframes slideFromRight{
  from{opacity:0;transform:translateX(60px)}
  to{opacity:1;transform:translateX(0)}
}
@keyframes cardPop{
  from{opacity:0;transform:translateY(40px) scale(0.95)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes statPop{
  from{opacity:0;transform:translateY(30px) scale(0.9)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes lineExpand{
  from{width:0;opacity:0}
  to{width:100px;opacity:1}
}
@keyframes popScale{
  from{opacity:0;transform:scale(0.9)}
  to{opacity:1;transform:scale(1)}
}

/* ===== 테이블 슬라이드 ===== */
.styled-table{width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;flex:1;font-size:clamp(0.85rem,1.2vw,1.1rem)}
.styled-table thead th{background:var(--primary);color:#fff;padding:14px 18px;font-weight:700;text-align:left;border:none}
.styled-table tbody tr{transition:background 0.2s}
.styled-table tbody tr:nth-child(even){background:rgba(var(--glow),0.06)}
.styled-table tbody tr:hover{background:rgba(var(--glow),0.15)}
.styled-table tbody td{padding:12px 18px;border-bottom:1px solid var(--card-border)}
.styled-table tbody tr:last-child td{border-bottom:none}
.slide.active .styled-table{animation:fadeUp 0.6s ease 0.2s both}

/* ===== 이미지-텍스트 슬라이드 ===== */
.image-text-layout{display:flex;gap:40px;flex:1;align-items:center}
.image-text-left{flex:0 0 40%;max-width:40%;border-radius:16px;overflow:hidden;opacity:0;transform:translateX(-40px)}
.image-text-left img{width:100%;height:100%;object-fit:cover;display:block;border-radius:16px}
.image-text-left .img-placeholder{width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,rgba(var(--glow),0.15),rgba(var(--glow),0.05));border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:0.3}
.image-text-right{flex:1;display:flex;flex-direction:column;gap:12px}
.image-text-right h3{font-size:clamp(1.1rem,1.6vw,1.5rem);font-weight:700;color:var(--primary);margin-bottom:8px}
.image-text-right p{font-size:clamp(0.95rem,1.3vw,1.2rem);line-height:1.7;opacity:0.85}
.image-text-right ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:8px}
.image-text-right ul li{font-size:clamp(0.95rem,1.3vw,1.2rem);line-height:1.6;padding:8px 14px;border-radius:10px;background:rgba(var(--glow),0.05)}
.image-text-right ul li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:10px;vertical-align:middle}
.slide.active .image-text-left{animation:slideFromLeft 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide.active .image-text-right{opacity:0;animation:slideFromRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards}

/* ===== 아젠다 슬라이드 ===== */
.agenda-container{display:flex;flex-direction:column;gap:6px;flex:1;justify-content:center}
.agenda-item{display:flex;align-items:center;gap:20px;padding:16px 24px;border-radius:16px;border:1px solid transparent;transition:all 0.4s ease;opacity:0;transform:translateX(-30px)}
.agenda-item.agenda-past{opacity:0.35;filter:grayscale(0.3)}
.agenda-item.agenda-current{background:rgba(var(--glow),0.12);border-color:var(--primary);box-shadow:0 4px 24px rgba(var(--glow),0.2);transform:translateX(8px) scale(1.02) !important}
.agenda-item.agenda-future{opacity:0.7}
.agenda-num{width:44px;height:44px;min-width:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;transition:all 0.3s}
.agenda-item.agenda-past .agenda-num{background:rgba(var(--glow),0.1);color:var(--text);opacity:0.5}
.agenda-item.agenda-current .agenda-num{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;box-shadow:0 4px 16px rgba(var(--glow),0.4)}
.agenda-item.agenda-future .agenda-num{background:rgba(var(--glow),0.08);color:var(--text);opacity:0.6}
.agenda-title{font-size:clamp(1rem,1.5vw,1.4rem);font-weight:600}
.agenda-item.agenda-current .agenda-title{color:var(--primary);font-weight:700}
.agenda-check{margin-left:auto;font-size:1.1rem;opacity:0.5}
.agenda-item.agenda-past .agenda-check{color:var(--success);opacity:0.8}
.slide.active .agenda-item{animation:slideRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .agenda-item:nth-child(1){animation-delay:0.1s}
.slide.active .agenda-item:nth-child(2){animation-delay:0.2s}
.slide.active .agenda-item:nth-child(3){animation-delay:0.3s}
.slide.active .agenda-item:nth-child(4){animation-delay:0.4s}
.slide.active .agenda-item:nth-child(5){animation-delay:0.5s}
.slide.active .agenda-item:nth-child(6){animation-delay:0.6s}
.slide.active .agenda-item:nth-child(7){animation-delay:0.7s}
.slide.active .agenda-item:nth-child(8){animation-delay:0.8s}

/* ===== 미니 TOC (좌측 사이드) ===== */
.mini-toc{position:fixed;left:6px;top:50%;transform:translateY(-50%);z-index:102;display:flex;flex-direction:column;gap:12px;padding:8px 4px}
.mini-toc-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:pointer;transition:all 0.3s;position:relative;border:none;padding:0}
.mini-toc-dot:hover{background:rgba(var(--glow),0.4);transform:scale(1.4)}
.mini-toc-dot.mini-active{background:var(--primary);box-shadow:0 0 8px rgba(var(--glow),0.5);transform:scale(1.3)}
.mini-toc-dot .mini-toc-label{position:absolute;left:22px;top:50%;transform:translateY(-50%);white-space:nowrap;font-size:0.75rem;background:rgba(0,0,0,0.8);color:#fff;padding:4px 10px;border-radius:6px;opacity:0;pointer-events:none;transition:opacity 0.2s}
.mini-toc-dot:hover .mini-toc-label{opacity:1}

/* ===== 슬라이드 메모 아이콘 ===== */
.slide-note-btn{position:absolute;bottom:60px;right:20px;z-index:10;width:40px;height:40px;border-radius:50%;background:rgba(var(--glow),0.15);border:1px solid var(--card-border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:var(--text);opacity:0.4;transition:all 0.3s;backdrop-filter:blur(4px)}
.slide-note-btn:hover{opacity:1;background:rgba(var(--glow),0.25);transform:scale(1.1)}
.slide-note-popup{position:absolute;bottom:110px;right:20px;z-index:10;max-width:320px;padding:16px 20px;border-radius:12px;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);color:rgba(255,255,255,0.85);font-size:0.9rem;line-height:1.6;border:1px solid rgba(255,255,255,0.1);display:none;pointer-events:auto}
.slide-note-popup.visible{display:block}

/* ===== 포인터 모드 ===== */
.pointer-mode{cursor:none !important}
.pointer-mode *{cursor:none !important}
.laser-pointer{position:fixed;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,rgba(255,50,50,0.9),rgba(255,0,0,0.4));box-shadow:0 0 20px rgba(255,0,0,0.6),0 0 40px rgba(255,0,0,0.3);pointer-events:none;z-index:9999;transform:translate(-50%,-50%);display:none;will-change:transform}
.pointer-mode .laser-pointer{display:block}
.laser-trail{position:fixed;width:8px;height:8px;border-radius:50%;background:rgba(255,50,50,0.3);pointer-events:none;z-index:9998;transform:translate(-50%,-50%);will-change:transform,opacity}

/* ===== 발표 모드 진입 안내 오버레이 ===== */
.onboard-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:600;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity 0.5s}
.onboard-overlay.hiding{opacity:0;pointer-events:none}
.onboard-content{text-align:center;color:#fff}
.onboard-icon{font-size:3rem;margin-bottom:16px;opacity:0.8}
.onboard-title{font-size:1.3rem;font-weight:700;margin-bottom:8px}
.onboard-desc{font-size:0.95rem;opacity:0.6;line-height:1.6}
.onboard-keys{display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.onboard-key{padding:6px 14px;border-radius:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);font-size:0.8rem;font-weight:600}

/* ===== PDF 인쇄 안내 팝업 ===== */
.print-guide{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:500;background:var(--slide-bg);border:1px solid var(--card-border);border-radius:20px;padding:32px 40px;max-width:480px;width:90%;display:none;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.print-guide.visible{display:block}
.print-guide-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;z-index:499;background:rgba(0,0,0,0.6);display:none}
.print-guide-backdrop.visible{display:block}
.print-guide h3{font-size:1.3rem;font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.print-guide ol{padding-left:20px;display:flex;flex-direction:column;gap:8px}
.print-guide li{font-size:0.95rem;line-height:1.6;opacity:0.8}
.print-guide .print-close{margin-top:20px;padding:8px 24px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;border:none;cursor:pointer;font-size:0.9rem;font-weight:600}

/* ===== will-change 성능 힌트 ===== */
.slide{will-change:opacity,transform}
.card,.stat-item,.cycle-node,.chevron,.funnel-stage,.comp-side{will-change:transform,opacity}
.progress-fill{will-change:width}
.bar-fill{will-change:transform}
.donut-fill,.ring-fill{will-change:stroke-dashoffset}

/* ===== 인쇄 스타일 ===== */
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  @page{size:landscape;margin:0}
  body{overflow:visible;height:auto;background:#fff}
  .presentation{width:auto;height:auto;overflow:visible;position:relative}
  .slide{position:relative!important;opacity:1!important;pointer-events:auto!important;transform:none!important;page-break-after:always;page-break-inside:avoid;break-after:page;break-inside:avoid;width:100vw;height:100vh;display:flex!important}
  .slide.prev{opacity:1!important;transform:none!important}
  .slide *{opacity:1!important;transform:none!important;animation:none!important}
  .nav-bar,.fullscreen-btn,.notes-panel,.presentation-timer,.thumb-overlay,.dot-nav,.help-overlay,.watermark,.mode-indicator,.mini-toc,.onboard-overlay,.print-guide,.print-guide-backdrop,.laser-pointer,.slide-note-btn,.slide-note-popup{display:none!important}
  .particles-container{display:none}
  .progress-fill{width:var(--progress-target,0%)!important}
  .bar-fill{transform:scaleY(1)!important}
}
</style>
</head>
<body>
<!-- 접근성: aria-live 영역 -->
<div class="sr-only" aria-live="polite" id="slideAnnounce"></div>

<div class="presentation${template ? ' tpl-' + template : ''}" id="presentation">
${slidesHTML}
</div>

<script type="application/json" id="slideNotesData">${JSON.stringify(collectSlideNotes(data))}</script>

<div class="nav-bar">
  <div class="progress-bar" id="progressBar"></div>
  <button class="nav-btn" onclick="prevSlide()">&#8592; 이전</button>
  <span class="slide-counter" id="slideCounter">1 / 1</span>
  <button class="nav-btn" onclick="nextSlide()">다음 &#8594;</button>
</div>
<button class="fullscreen-btn" onclick="toggleFullscreen()" title="전체화면">&#x26F6;</button>

<!-- 도트 네비게이션 -->
<div class="dot-nav" id="dotNav"></div>

<!-- 미니 TOC -->
<div class="mini-toc" id="miniToc"></div>

<!-- 레이저 포인터 -->
<div class="laser-pointer" id="laserPointer"></div>

<!-- 발표 모드 진입 안내 -->
<div class="onboard-overlay" id="onboardOverlay">
  <div class="onboard-content">
    <div class="onboard-icon">&#9000;</div>
    <div class="onboard-title">키보드로 발표를 시작하세요</div>
    <div class="onboard-desc">아래 단축키를 사용하여 슬라이드를 조작합니다</div>
    <div class="onboard-keys">
      <span class="onboard-key">&#8594; 다음</span>
      <span class="onboard-key">&#8592; 이전</span>
      <span class="onboard-key">F 전체화면</span>
      <span class="onboard-key">H 도움말</span>
      <span class="onboard-key">P 포인터</span>
    </div>
  </div>
</div>

<!-- PDF 인쇄 안내 -->
<div class="print-guide-backdrop" id="printBackdrop" onclick="closePrintGuide()"></div>
<div class="print-guide" id="printGuide">
  <h3>&#128424; PDF 내보내기 안내</h3>
  <ol>
    <li><strong>Ctrl+P</strong> (Mac: Cmd+P) 로 인쇄 대화상자 열기</li>
    <li><strong>대상</strong>을 "PDF로 저장"으로 선택</li>
    <li><strong>레이아웃</strong>을 "가로"로 설정</li>
    <li><strong>배경 그래픽</strong> 체크 (색상/그라데이션 포함)</li>
    <li><strong>여백</strong>을 "없음"으로 설정</li>
    <li><strong>저장</strong> 클릭</li>
  </ol>
  <button class="print-close" onclick="closePrintGuide()">확인</button>
</div>

<!-- 모드 인디케이터 -->
<div class="mode-indicator" id="modeIndicator"></div>

<div class="notes-panel" id="notesPanel">
  <div class="notes-panel-header">
    <span>&#128221; 발표자 노트 (N)</span>
    <button class="notes-panel-close" onclick="toggleNotes()">&#10005;</button>
  </div>
  <div class="notes-content" id="notesContent"></div>
</div>

<div class="presentation-timer" id="presentationTimer">
  <span class="timer-dot" id="timerDot"></span>
  <span id="timerDisplay">00:00</span>
</div>

<div class="thumb-overlay" id="thumbOverlay">
  <div class="thumb-header">
    <h3>&#9638; 슬라이드 탐색 (G)</h3>
    <button class="thumb-close" onclick="toggleThumbnails()">&#10005;</button>
  </div>
  <div class="thumb-grid" id="thumbGrid"></div>
</div>

<!-- 키보드 단축키 도움말 -->
<div class="help-overlay" id="helpOverlay">
  <div class="help-content">
    <h3>키보드 단축키</h3>
    <div class="help-grid">
      <span class="help-key">&#8594; / Space / Enter</span><span class="help-desc">다음 슬라이드</span>
      <span class="help-key">&#8592; / Backspace</span><span class="help-desc">이전 슬라이드</span>
      <span class="help-key">Home</span><span class="help-desc">처음으로</span>
      <span class="help-key">End</span><span class="help-desc">마지막으로</span>
      <span class="help-key">F</span><span class="help-desc">전체화면 토글</span>
      <span class="help-key">N</span><span class="help-desc">발표자 노트 토글</span>
      <span class="help-key">T</span><span class="help-desc">발표 타이머 토글</span>
      <span class="help-key">G</span><span class="help-desc">슬라이드 탐색 (썸네일)</span>
      <span class="help-key">D</span><span class="help-desc">다크/라이트 모드 전환</span>
      <span class="help-key">Z</span><span class="help-desc">줌 모드 토글 (150%)</span>
      <span class="help-key">P</span><span class="help-desc">레이저 포인터 모드</span>
      <span class="help-key">H</span><span class="help-desc">이 도움말 토글</span>
      <span class="help-key">Esc</span><span class="help-desc">열린 패널 닫기</span>
    </div>
    <div class="help-close-hint">H 또는 Esc를 눌러 닫기</div>
  </div>
</div>

<script>
let current=0;
const slides=document.querySelectorAll('.slide');
const total=slides.length;
let pointerMode=false;
const laserTrails=[];

// URL 파라미터 파싱
const urlParams=new URLSearchParams(window.location.search);
const transitionMode=urlParams.get('transition')||'fade';
const autoplayInterval=parseInt(urlParams.get('autoplay'))||0;

// 전환 효과 적용
document.getElementById('presentation').classList.add('transition-'+transitionMode);

// 접근성: role 설정
slides.forEach((s,i)=>{
  s.setAttribute('role','tabpanel');
  s.setAttribute('aria-label','슬라이드 '+(i+1)+' / '+total);
});

// 발표자 노트 데이터
const slideNotes=JSON.parse(document.getElementById('slideNotesData').textContent);

// 타이머 상태
let timerRunning=false,timerStart=0,timerElapsed=0,timerInterval=null;

// 줌/다크모드 상태
let zoomMode=false;

// 자동 재생
let autoplayTimer=null;
function startAutoplay(){
  if(autoplayInterval>0){
    stopAutoplay();
    autoplayTimer=setInterval(()=>{
      if(current<total-1)showSlide(current+1);
      else showSlide(0);
    },autoplayInterval);
  }
}
function stopAutoplay(){if(autoplayTimer){clearInterval(autoplayTimer);autoplayTimer=null}}

// BroadcastChannel 연동
let bc=null;
try{bc=new BroadcastChannel('presentation-sync')}catch(e){}

// 도트 네비게이션 생성
function buildDotNav(){
  const nav=document.getElementById('dotNav');
  nav.innerHTML='';
  for(let i=0;i<total;i++){
    const btn=document.createElement('button');
    btn.className='dot-nav-item'+(i===0?' dot-active':'');
    btn.title='슬라이드 '+(i+1);
    btn.setAttribute('aria-label','슬라이드 '+(i+1)+'로 이동');
    btn.addEventListener('click',()=>showSlide(i));
    nav.appendChild(btn);
  }
}
function updateDotNav(idx){
  document.querySelectorAll('.dot-nav-item').forEach((d,i)=>{
    d.classList.toggle('dot-active',i===idx);
  });
}

// 모드 인디케이터 표시
function showModeIndicator(text){
  const el=document.getElementById('modeIndicator');
  el.textContent=text;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer=setTimeout(()=>el.classList.remove('visible'),1200);
}

function showSlide(idx,fromBroadcast){
  slides.forEach((s,i)=>{
    s.classList.remove('active','prev');
    if(i<idx) s.classList.add('prev');
  });
  const target=slides[idx];
  void target.offsetWidth;
  target.classList.add('active');
  // 타임라인 연결선 리셋
  target.querySelectorAll('.timeline').forEach(el=>{
    el.style.setProperty('--tl-anim','none');
    void el.offsetWidth;
    el.style.removeProperty('--tl-anim');
  });
  current=idx;
  document.getElementById('slideCounter').textContent=(current+1)+' / '+total;
  document.getElementById('progressBar').style.width=((current+1)/total*100)+'%';

  // stats 카운트업 애니메이션
  target.querySelectorAll('.count-up').forEach(el=>{
    const t=parseInt(el.dataset.target);
    const s=el.dataset.suffix||'';
    el.textContent='0'+s;
    animateCount(el,0,t,1800,s);
  });

  // progress bar 애니메이션
  target.querySelectorAll('.progress-fill').forEach(el=>{
    const w=el.style.getPropertyValue('--progress-target');
    el.style.width='0%';
    void el.offsetWidth;
    el.style.width=w;
  });

  // 퍼널 카운트업 애니메이션
  target.querySelectorAll('.funnel-count-up').forEach(el=>{
    const t2=parseInt(el.dataset.target);
    const s2=el.dataset.suffix||'';
    el.textContent='0'+s2;
    animateCount(el,0,t2,1500,s2);
  });

  // 발표자 노트 업데이트
  updateNotes(idx);
  updateThumbActive(idx);
  updateDotNav(idx);
  updateMiniToc(idx);

  // 접근성: 슬라이드 변경 알림
  const h=target.querySelector('h1,h2');
  const announce=document.getElementById('slideAnnounce');
  announce.textContent='슬라이드 '+(idx+1)+' / '+total+(h?': '+h.textContent:'');

  // BroadcastChannel로 동기화 메시지 전송
  if(!fromBroadcast && bc){
    try{bc.postMessage({type:'slide-change',index:idx})}catch(e){}
  }

  // 자동 재생 리셋
  if(autoplayInterval>0)startAutoplay();
}

function animateCount(el,start,end,dur,suffix){
  const t0=performance.now();
  (function tick(now){
    const p=Math.min((now-t0)/dur,1);
    const e=1-Math.pow(1-p,4);
    el.textContent=Math.floor(start+(end-start)*e).toLocaleString()+suffix;
    if(p<1)requestAnimationFrame(tick);
  })(t0);
}

function nextSlide(){if(current<total-1)showSlide(current+1)}
function prevSlide(){if(current>0)showSlide(current-1)}
function toggleFullscreen(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

// ===== 다크/라이트 모드 토글 =====
function toggleDarkLight(){
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')==='dark';
  html.setAttribute('data-theme',isDark?'light':'dark');
  showModeIndicator(isDark?'\\u2600 라이트 모드':'\\u263D 다크 모드');
}

// ===== 줌 모드 토글 =====
function toggleZoom(){
  const pres=document.getElementById('presentation');
  zoomMode=!zoomMode;
  pres.classList.toggle('zoom-mode',zoomMode);
  showModeIndicator(zoomMode?'\\uD83D\\uDD0D 줌 모드 ON (150%)':'\\uD83D\\uDD0D 줌 모드 OFF');
}

// ===== 발표자 노트 =====
function updateNotes(idx){
  const nc=document.getElementById('notesContent');
  nc.textContent=slideNotes[idx]||'';
}
function toggleNotes(){
  const p=document.getElementById('notesPanel');
  p.classList.toggle('visible');
  if(p.classList.contains('visible'))updateNotes(current);
}

// ===== 발표 타이머 =====
function toggleTimer(){
  const el=document.getElementById('presentationTimer');
  if(!el.classList.contains('visible')){
    el.classList.add('visible');
    startTimer();
    return;
  }
  if(timerRunning){pauseTimer()}else{startTimer()}
}
function startTimer(){
  timerRunning=true;
  timerStart=Date.now()-timerElapsed;
  document.getElementById('timerDot').className='timer-dot running';
  clearInterval(timerInterval);
  timerInterval=setInterval(updateTimerDisplay,200);
}
function pauseTimer(){
  timerRunning=false;
  timerElapsed=Date.now()-timerStart;
  document.getElementById('timerDot').className='timer-dot paused';
  clearInterval(timerInterval);
}
function updateTimerDisplay(){
  const ms=Date.now()-timerStart;
  const totalSec=Math.floor(ms/1000);
  const m=String(Math.floor(totalSec/60)).padStart(2,'0');
  const s=String(totalSec%60).padStart(2,'0');
  document.getElementById('timerDisplay').textContent=m+':'+s;
}

// ===== 썸네일 네비게이터 =====
function buildThumbnails(){
  const grid=document.getElementById('thumbGrid');
  grid.innerHTML='';
  slides.forEach((sl,i)=>{
    const item=document.createElement('div');
    item.className='thumb-item'+(i===current?' thumb-active':'');
    const num=document.createElement('span');
    num.className='thumb-num';
    num.textContent=String(i+1);
    const ttl=document.createElement('span');
    ttl.className='thumb-title';
    const h=sl.querySelector('h1,h2');
    ttl.textContent=h?h.textContent:'슬라이드 '+(i+1);
    const bg=getComputedStyle(sl).background;
    item.style.background=bg||'var(--slide-bg)';
    item.appendChild(num);
    item.appendChild(ttl);
    item.addEventListener('click',()=>{showSlide(i);toggleThumbnails()});
    grid.appendChild(item);
  });
}
function toggleThumbnails(){
  const ov=document.getElementById('thumbOverlay');
  if(!ov.classList.contains('visible')){buildThumbnails();ov.classList.add('visible')}
  else{ov.classList.remove('visible')}
}
function updateThumbActive(idx){
  document.querySelectorAll('.thumb-item').forEach((t,i)=>{
    t.classList.toggle('thumb-active',i===idx);
  });
}

// ===== 키보드 단축키 도움말 =====
function toggleHelp(){
  const h=document.getElementById('helpOverlay');
  h.classList.toggle('visible');
}

// ===== 미니 TOC 생성 =====
function buildMiniToc(){
  const toc=document.getElementById('miniToc');
  if(!toc)return;
  toc.innerHTML='';
  slides.forEach((sl,i)=>{
    const dot=document.createElement('button');
    dot.className='mini-toc-dot'+(i===0?' mini-active':'');
    const h=sl.querySelector('h1,h2');
    const label=document.createElement('span');
    label.className='mini-toc-label';
    label.textContent=h?h.textContent:'#'+(i+1);
    dot.appendChild(label);
    dot.addEventListener('click',()=>showSlide(i));
    toc.appendChild(dot);
  });
}
function updateMiniToc(idx){
  document.querySelectorAll('.mini-toc-dot').forEach((d,i)=>{
    d.classList.toggle('mini-active',i===idx);
  });
}

// ===== 포인터 모드 =====
function togglePointer(){
  pointerMode=!pointerMode;
  document.body.classList.toggle('pointer-mode',pointerMode);
  showModeIndicator(pointerMode?'\\uD83D\\uDD34 포인터 모드 ON':'\\uD83D\\uDD34 포인터 모드 OFF');
}
document.addEventListener('mousemove',function(e){
  if(!pointerMode)return;
  const lp=document.getElementById('laserPointer');
  if(lp){lp.style.left=e.clientX+'px';lp.style.top=e.clientY+'px';}
  // trail
  const trail=document.createElement('div');
  trail.className='laser-trail';
  trail.style.left=e.clientX+'px';
  trail.style.top=e.clientY+'px';
  document.body.appendChild(trail);
  setTimeout(()=>{trail.style.opacity='0';setTimeout(()=>trail.remove(),200)},100);
});

// ===== 슬라이드 메모 팝업 =====
function toggleSlideNote(btn){
  const popup=btn.parentElement.querySelector('.slide-note-popup');
  if(popup)popup.classList.toggle('visible');
}

// ===== PDF 인쇄 안내 =====
function showPrintGuide(){
  document.getElementById('printBackdrop').classList.add('visible');
  document.getElementById('printGuide').classList.add('visible');
}
function closePrintGuide(){
  document.getElementById('printBackdrop').classList.remove('visible');
  document.getElementById('printGuide').classList.remove('visible');
}

// ===== 발표 모드 진입 안내 =====
function dismissOnboard(){
  const ov=document.getElementById('onboardOverlay');
  if(ov){ov.classList.add('hiding');setTimeout(()=>ov.remove(),600);}
}
setTimeout(dismissOnboard,2000);

// ===== 목차 클릭으로 섹션 이동 =====
function goToSection(sectionIdx){
  // sectionIdx는 data-section-index에 저장된 슬라이드 인덱스
  if(sectionIdx>=0 && sectionIdx<total) showSlide(sectionIdx);
}

document.addEventListener('keydown',e=>{
  // 도움말 열려있을 때
  if(document.getElementById('helpOverlay').classList.contains('visible')){
    if(e.key==='Escape'||e.key==='h'||e.key==='H'){toggleHelp();return}
    return;
  }
  // 썸네일/노트 패널이 열려있을 때 Escape로 닫기
  if(e.key==='Escape'){
    if(zoomMode){toggleZoom();return}
    if(document.getElementById('thumbOverlay').classList.contains('visible')){toggleThumbnails();return}
    if(document.getElementById('notesPanel').classList.contains('visible')){toggleNotes();return}
  }
  if(['ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();nextSlide()}
  if(['ArrowLeft','Backspace'].includes(e.key)){e.preventDefault();prevSlide()}
  if(e.key==='f'||e.key==='F')toggleFullscreen();
  if(e.key==='n'||e.key==='N')toggleNotes();
  if(e.key==='t'||e.key==='T')toggleTimer();
  if(e.key==='g'||e.key==='G')toggleThumbnails();
  if(e.key==='h'||e.key==='H')toggleHelp();
  if(e.key==='d'||e.key==='D')toggleDarkLight();
  if(e.key==='z'||e.key==='Z')toggleZoom();
  if(e.key==='p'||e.key==='P'){if(!e.ctrlKey&&!e.metaKey)togglePointer();}
  if(e.key==='Home')showSlide(0);
  if(e.key==='End')showSlide(total-1);
  if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();showPrintGuide();}
});

// ===== 터치 제스처 =====
let touchStartX=0,touchStartY=0;
document.addEventListener('touchstart',e=>{
  touchStartX=e.touches[0].clientX;
  touchStartY=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchend',e=>{
  const dx=touchStartX-e.changedTouches[0].clientX;
  const dy=touchStartY-e.changedTouches[0].clientY;
  if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)){
    dx>0?nextSlide():prevSlide();
  }
},{passive:true});

// ===== BroadcastChannel 수신 =====
if(bc){
  bc.onmessage=function(e){
    if(e.data&&e.data.type==='slide-change'&&typeof e.data.index==='number'){
      showSlide(e.data.index,true);
    }
  };
}

// 초기화
buildDotNav();
buildMiniToc();
showSlide(0);
if(autoplayInterval>0)startAutoplay();
</script>
</body>
</html>`;
}

function collectSlideNotes(data) {
  const notes = [];
  if (data.cover) notes.push(data.cover.notes || '');
  if (data.toc && data.toc.length > 0) notes.push('');
  if (data.content) {
    for (const s of data.content) {
      notes.push(s.notes || '');
    }
  }
  if (data.ending) notes.push(data.ending.notes || '');
  return notes;
}

// ===== 슬라이드 타입별 HTML 생성 함수 (모듈화) =====

function generateBullets(s) {
  /** Highlight numbers/percentages in text */
  function highlightNumbers(text) {
    return esc(text).replace(
      /(\d[\d,.]*\s*(?:%|명|건|원|개|만|억|조|달러|배|위|개월|년|시간)?)/g,
      '<strong class="num-highlight">$1</strong>'
    );
  }
  return `
    <ul class="bullet-list">
      ${(s.items || []).map((item, i) => `
      <li>
        <span class="bullet-icon">${String(i + 1).padStart(2, '0')}</span>
        <span>${highlightNumbers(item)}</span>
      </li>`).join('')}
    </ul>`;
}

function generateCards(s) {
  // Content-aware icon selection
  function pickIcon(title, body, idx) {
    const text = ((title || '') + ' ' + (body || '')).toLowerCase();
    if (/학습|교육|커리큘럼|강의/.test(text)) return '&#128218;';
    if (/피드백|측정|평가|분석|데이터/.test(text)) return '&#128200;';
    if (/vr|ar|시뮬|현장|실습/.test(text)) return '&#127918;';
    if (/마이크로|집중|모바일|앱/.test(text)) return '&#9889;';
    if (/ai|인공지능|자동|모델/.test(text)) return '&#129302;';
    if (/전략|계획|로드맵/.test(text)) return '&#127919;';
    if (/성과|성장|향상|개선/.test(text)) return '&#128640;';
    if (/비용|예산|투자|roi/.test(text)) return '&#128176;';
    if (/보안|안전|위험/.test(text)) return '&#128737;';
    if (/소통|협업|팀|조직/.test(text)) return '&#129309;';
    if (/글로벌|세계|시장/.test(text)) return '&#127758;';
    if (/시간|속도|효율/.test(text)) return '&#9201;';
    const fallback = ['&#128161;', '&#9881;', '&#128302;', '&#127775;', '&#128736;', '&#128204;'];
    return fallback[idx % fallback.length];
  }
  return `
    <div class="cards-container">
      ${(s.cards || []).map((c, i) => `
      <div class="card">
        <div class="card-icon">${pickIcon(c.title, c.body, i)}</div>
        <h3>${esc(c.title)}</h3>
        ${c.items
          ? `<ul>${c.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>`
          : `<p>${esc(c.body || '')}</p>`}
      </div>`).join('')}
    </div>`;
}

function generateSteps(s) {
  return `
    <div class="steps-container">
      ${(s.steps || []).map((step, i) => `
      <div class="step">
        <div class="step-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="step-body">
          <h4>${esc(typeof step === 'string' ? step : step.title)}</h4>
          ${step.desc ? `<p>${esc(step.desc)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>`;
}

function generateTwoColumn(s) {
  return `
    <div class="two-col" style="position:relative">
      <div class="col">
        <h3>${esc(s.leftTitle || '')}</h3>
        <ul class="bullet-list">
          ${(s.leftItems || []).map((item, i) => `
          <li><span class="bullet-icon">${String(i + 1).padStart(2, '0')}</span><span>${esc(item)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="vs-badge">VS</div>
      <div class="col">
        <h3>${esc(s.rightTitle || '')}</h3>
        <ul class="bullet-list">
          ${(s.rightItems || []).map((item, i) => `
          <li><span class="bullet-icon">${String(i + 1).padStart(2, '0')}</span><span>${esc(item)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;
}

function generateStats(s) {
  return `
    <div class="stat-grid">
      ${(s.stats || []).map(stat => {
        const pct = Math.min(stat.value, 100);
        const offset = Math.round(226 - (226 * pct / 100));
        return `
      <div class="stat-item">
        <div class="stat-ring">
          <svg viewBox="0 0 80 80"><circle class="ring-bg" cx="40" cy="40" r="36"/><circle class="ring-fill" cx="40" cy="40" r="36" style="--ring-offset:${offset}"/></svg>
        </div>
        <span class="stat-number count-up" data-target="${stat.value}" data-suffix="${esc(stat.suffix || '')}">${stat.value}${esc(stat.suffix || '')}</span>
        <span class="stat-label">${esc(stat.label)}</span>
      </div>`;
      }).join('')}
    </div>`;
}

function generateTimeline(s) {
  return `
    <div class="timeline">
      ${(s.events || []).map(ev => `
      <div class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-year">${esc(ev.year || ev.label || '')}</div>
        <div class="tl-desc">${esc(ev.desc || ev.text || '')}</div>
      </div>`).join('')}
    </div>`;
}

function generateChecklist(s) {
  return `
    <ul class="checklist">
      ${(s.items || []).map(item => {
        const isObj = typeof item === 'object';
        const text = isObj ? item.text : item;
        const done = isObj ? item.done !== false : true;
        return `
      <li>
        <span class="check-icon ${done ? 'done' : 'todo'}">${done ? '<svg viewBox="0 0 20 20"><path d="M4 10 L8 14 L16 6"/></svg>' : ''}</span>
        <span>${esc(text)}</span>
      </li>`;
      }).join('')}
    </ul>`;
}

function generateQuote(s) {
  return `
    <div class="quote-container">
      <div class="quote-mark">&ldquo;</div>
      <div class="quote-text">${esc(s.quote || s.body || '')}</div>
      <div class="quote-author">&mdash; ${esc(s.author || '')}</div>
    </div>`;
}

function generateProgress(s) {
  return `
    <div class="progress-list">
      ${(s.items || []).map(item => `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">${esc(item.label)}</span>
          <span class="progress-value">${item.value}${esc(item.suffix || '%')}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="--progress-target:${Math.min(item.value, 100)}%"></div>
        </div>
      </div>`).join('')}
    </div>`;
}

function generatePyramid(s) {
  const levels = s.levels || [];
  return `
    <div class="pyramid">
      ${levels.map((lv, i) => {
        const widthPct = 30 + ((levels.length - 1 - i) / Math.max(levels.length - 1, 1)) * 70;
        return `
      <div class="pyramid-level" style="width:${widthPct}%">
        <h4>${esc(typeof lv === 'string' ? lv : lv.title)}</h4>
        ${lv.desc ? `<p>${esc(lv.desc)}</p>` : ''}
      </div>`;
      }).join('')}
    </div>`;
}

function generateIconGrid(s) {
  const icons = ['&#9670;','&#9733;','&#9679;','&#9830;','&#10070;','&#10022;'];
  return `
    <div class="icon-grid">
      ${(s.items || []).map((item, i) => `
      <div class="ig-item">
        <div class="ig-icon">${item.icon || icons[i % icons.length]}</div>
        <div class="ig-title">${esc(item.title)}</div>
        <div class="ig-desc">${esc(item.desc || '')}</div>
      </div>`).join('')}
    </div>`;
}

function generateDonut(s) {
  return `
    <div class="donut-grid">
      ${(s.items || []).map(item => {
        const pct = Math.min(item.value, 100);
        const offset = Math.round(314 - (314 * pct / 100));
        return `
      <div class="donut-item">
        <div class="donut-svg">
          <svg viewBox="0 0 110 110"><circle class="donut-bg" cx="55" cy="55" r="50"/><circle class="donut-fill" cx="55" cy="55" r="50" style="--donut-offset:${offset}"/></svg>
          <span class="donut-center count-up" data-target="${item.value}" data-suffix="${esc(item.suffix || '%')}">${item.value}${esc(item.suffix || '%')}</span>
        </div>
        <span class="donut-label">${esc(item.label)}</span>
      </div>`;
      }).join('')}
    </div>`;
}

function generateMatrix(s) {
  const cells = s.cells || [];
  return `
    <div class="matrix-grid">
      ${cells.slice(0, 4).map(c => `
      <div class="matrix-cell">
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.body || '')}</p>
      </div>`).join('')}
    </div>`;
}

function generateCycle(s) {
  const nodes = s.nodes || [];
  const n = nodes.length;
  // SVG 점선 화살표 점 생성
  let svgDots = '';
  for (let i = 0; i < n; i++) {
    const a1 = (2 * Math.PI * i / n) - Math.PI / 2;
    const a2 = (2 * Math.PI * ((i + 1) % n) / n) - Math.PI / 2;
    const r = 45;
    for (let d = 0.2; d <= 0.8; d += 0.15) {
      const angle = a1 + (a2 - a1) * d;
      const cx = 50 + r * Math.cos(angle);
      const cy = 50 + r * Math.sin(angle);
      const delay = (i * 0.3 + d * 0.3).toFixed(2);
      svgDots += `<circle cx="${cx.toFixed(1)}%" cy="${cy.toFixed(1)}%" r="2" style="animation-delay:${delay}s"/>`;
    }
  }

  return `
    <div class="cycle-container">
      <div class="cycle-ring">
        <svg class="cycle-svg-arrows" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;width:100%;height:100%">
          ${svgDots}
        </svg>
        <div class="cycle-orbit"><div class="cycle-orbit-dot"></div></div>
        ${nodes.map((nd, i) => {
          const angle = (2 * Math.PI * i / n) - Math.PI / 2;
          const r = 45;
          const x = 50 + r * Math.cos(angle);
          const y = 50 + r * Math.sin(angle);
          return `
        <div class="cycle-node" style="left:${x}%;top:${y}%;animation-delay:${0.1 + i * 0.15}s">
          <h4>${esc(typeof nd === 'string' ? nd : nd.title)}</h4>
          ${nd.desc ? `<p>${esc(nd.desc)}</p>` : ''}
        </div>`;
        }).join('')}
      </div>
    </div>`;
}

function generateProcessArrow(s) {
  return `
    <div class="chevron-container">
      ${(s.steps || []).map((st, i) => `
      <div class="chevron">
        <h4>${esc(typeof st === 'string' ? st : st.title)}</h4>
        ${st.desc ? `<p>${esc(st.desc)}</p>` : ''}
      </div>`).join('')}
    </div>`;
}

function generateBarChart(s) {
  const items = s.items || [];
  const maxVal = Math.max(...items.map(it => it.value), 1);
  return `
    <div class="bar-chart">
      ${items.map((item, i) => {
        const hPct = (item.value / maxVal) * 100;
        return `
      <div class="bar-item">
        <div class="bar-value">${item.value}${esc(item.suffix || '')}</div>
        <div class="bar-fill" style="height:${Math.max(hPct, 5)}%;transition-delay:${i * 0.15}s"></div>
        <div class="bar-label">${esc(item.label)}</div>
      </div>`;
      }).join('')}
    </div>`;
}

function generateHighlight(s) {
  return `
    <div class="highlight-box">
      <div class="hl-icon">${esc(s.icon || '!')}</div>
      <div class="hl-main">${esc(s.body || s.message || '')}</div>
      <div class="hl-sub">${esc(s.sub || '')}</div>
    </div>`;
}

function generateSwot(s) {
  const cells = [
    { key: 'strengths', label: 'Strengths', items: s.strengths || [] },
    { key: 'weaknesses', label: 'Weaknesses', items: s.weaknesses || [] },
    { key: 'opportunities', label: 'Opportunities', items: s.opportunities || [] },
    { key: 'threats', label: 'Threats', items: s.threats || [] }
  ];
  return `
    <div class="swot-grid">
      ${cells.map(c => `
      <div class="swot-cell">
        <h4>${c.label}</h4>
        <ul>${c.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>`;
}

function generateRoadmap(s) {
  return `
    <div class="roadmap">
      ${(s.phases || []).map(ph => `
      <div class="rm-phase">
        <div class="rm-dot"></div>
        <div class="rm-card">
          <h4>${esc(ph.title)}</h4>
          <p>${esc(ph.desc || '')}</p>
        </div>
        ${ph.label ? `<div class="rm-label">${esc(ph.label)}</div>` : ''}
      </div>`).join('')}
    </div>`;
}

function generateComparison(s) {
  return `
    <div class="comparison-container" style="position:relative">
      <div class="comp-side comp-left">
        <h3>${esc(s.leftTitle || '')}</h3>
        <ul>
          ${(s.leftItems || []).map(item => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="comp-vs-badge">VS</div>
      <div class="comp-side comp-right">
        <h3>${esc(s.rightTitle || '')}</h3>
        <ul>
          ${(s.rightItems || []).map(item => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </div>
    </div>`;
}

function generateFunnel(s) {
  const stages = s.stages || [];
  const n = stages.length;
  return `
    <div class="funnel-container">
      ${stages.map((st, i) => {
        const widthPct = 100 - (i / Math.max(n - 1, 1)) * 50;
        // Gradient: lighter at top, darker at bottom
        const lightness = 55 - (i / Math.max(n - 1, 1)) * 25;
        const hue = `hsl(from var(--primary) h s ${lightness}%)`;
        const bgStyle = `background:linear-gradient(135deg,rgba(var(--glow),${0.06 + i * 0.04}),rgba(var(--glow),${0.02 + i * 0.03}))`;
        return `
      <div class="funnel-stage" style="width:${widthPct}%;${bgStyle}">
        <div class="funnel-value">${st.value !== undefined ? `<span class="funnel-count-up" data-target="${st.value}" data-suffix="${esc(st.suffix || '')}">${st.value}${esc(st.suffix || '')}</span>` : ''}</div>
        <div>
          <h4>${esc(st.title)}</h4>
          ${st.desc ? `<p>${esc(st.desc)}</p>` : ''}
        </div>
      </div>
      ${i < n - 1 ? '<div class="funnel-arrow">&#9660;</div>' : ''}`;
      }).join('')}
    </div>`;
}

function generateTable(s) {
  const headers = s.headers || [];
  const rows = s.rows || [];
  return `
    <table class="styled-table">
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(row => `<tr>${(Array.isArray(row) ? row : [row]).map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
}

function generateImageText(s) {
  const imgSrc = s.imageUrl || s.image || '';
  const hasRealImage = imgSrc && imgSrc.startsWith('http');
  return `
    <div class="image-text-layout">
      <div class="image-text-left">
        ${hasRealImage
          ? `<img src="${esc(imgSrc)}" alt="" loading="lazy">`
          : `<div class="img-placeholder">&#128444;</div>`}
      </div>
      <div class="image-text-right">
        ${s.subtitle ? `<h3>${esc(s.subtitle)}</h3>` : ''}
        ${s.body ? `<p>${esc(s.body)}</p>` : ''}
        ${s.items ? `<ul>${s.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`;
}

function generateAgenda(s) {
  const items = s.items || [];
  const currentIndex = s.currentIndex !== undefined ? s.currentIndex : 0;
  return `
    <div class="agenda-container">
      ${items.map((item, i) => {
        const state = i < currentIndex ? 'agenda-past' : i === currentIndex ? 'agenda-current' : 'agenda-future';
        const text = typeof item === 'string' ? item : item.title || '';
        return `
      <div class="agenda-item ${state}">
        <div class="agenda-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="agenda-title">${esc(text)}</div>
        <span class="agenda-check">${i < currentIndex ? '&#10003;' : i === currentIndex ? '&#9654;' : ''}</span>
      </div>`;
      }).join('')}
    </div>`;
}

// ===== 메인 슬라이드 HTML 생성 =====

function generateSlidesHTML(data, t, options = {}) {
  let html = '';
  const watermark = options.watermark || '';

  // 워터마크 HTML 생성 헬퍼
  const watermarkHTML = watermark ? `<div class="watermark">${esc(watermark)}</div>` : '';

  // 표지 슬라이드 인덱스 (목차 클릭용)
  let slideIndex = 0;

  // 표지
  if (data.cover) {
    const logoHTML = data.cover.logoUrl
      ? `<img class="cover-logo" src="${esc(data.cover.logoUrl)}" alt="로고">`
      : '';
    html += `
  <div class="slide slide-cover" role="tabpanel">
    <div class="particles-container">
      <div class="particle"></div><div class="particle"></div><div class="particle"></div>
      <div class="particle"></div><div class="particle"></div><div class="particle"></div>
      <div class="particle"></div><div class="particle"></div><div class="particle"></div>
      <div class="particle"></div><div class="particle"></div><div class="particle"></div>
    </div>
    <div class="cover-decor">
      <svg viewBox="0 0 400 400" fill="none"><circle cx="200" cy="200" r="180" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><circle cx="200" cy="200" r="120" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><circle cx="200" cy="200" r="60" stroke="rgba(255,255,255,0.04)" stroke-width="1"/></svg>
    </div>
    ${logoHTML}
    <h1>${esc(data.cover.title)}</h1>
    <div class="accent-line"></div>
    ${data.cover.subtitle ? `<div class="subtitle">${esc(data.cover.subtitle)}</div>` : ''}
    ${data.cover.presenter ? `<div class="presenter">${esc(data.cover.presenter)}</div>` : ''}
    ${watermarkHTML}
  </div>`;
    slideIndex++;
  }

  // 목차 - 섹션 인덱스 계산
  if (data.toc && data.toc.length > 0) {
    // 섹션 슬라이드 인덱스 매핑 (목차 다음 슬라이드부터)
    const sectionSlideIndices = [];
    let contentIdx = slideIndex + 1; // 목차 다음
    if (data.content) {
      for (const s of data.content) {
        sectionSlideIndices.push(contentIdx);
        contentIdx++;
      }
    }

    html += `
  <div class="slide slide-content" role="tabpanel">
    <h2>목차</h2>
    <div class="title-line"></div>
    <div class="toc-container">
      ${data.toc.map((item, i) => {
        const targetIdx = sectionSlideIndices[i] !== undefined ? sectionSlideIndices[i] : slideIndex + 1;
        return `
      <div class="toc-item" onclick="goToSection(${targetIdx})">
        <div class="toc-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="toc-title">${esc(item)}</div>
        <span class="toc-arrow">&#8594;</span>
      </div>`;
      }).join('')}
    </div>
    ${watermarkHTML}
  </div>`;
    slideIndex++;
  }

  // 내용
  if (data.content) {
    for (const s of data.content) {
      if (s.isSection) {
        html += `
  <div class="slide slide-section" role="tabpanel">
    <span class="section-num">${esc(s.sectionNumber || '')}</span>
    <h2>${esc(s.title)}</h2>
    ${s.description ? `<div class="section-desc">${esc(s.description)}</div>` : ''}
    ${watermarkHTML}
  </div>`;
        slideIndex++;
        continue;
      }

      const hasPhoto = s.image && s.image !== 'illust' && s.image.startsWith('http');
      const hasIllust = s.image === 'illust';
      const extraClass = hasPhoto ? ' has-photo' : hasIllust ? ' has-image' : '';

      html += `
  <div class="slide slide-content${extraClass}" role="tabpanel">
    <h2>${esc(s.title)}</h2>
    <div class="title-line"></div>`;

      if (hasPhoto) {
        html += `<div class="slide-photo"><img src="${esc(s.image)}" alt="" loading="lazy"></div>`;
      }
      if (hasIllust) {
        html += generateSVGIllust(s.type);
      }

      // 타입별 분기 - 모듈화된 함수 호출
      const typeGenerators = {
        'bullets': generateBullets,
        'cards': generateCards,
        'steps': generateSteps,
        'two-column': generateTwoColumn,
        'stats': generateStats,
        'timeline': generateTimeline,
        'checklist': generateChecklist,
        'quote': generateQuote,
        'progress': generateProgress,
        'pyramid': generatePyramid,
        'icon-grid': generateIconGrid,
        'donut': generateDonut,
        'matrix': generateMatrix,
        'cycle': generateCycle,
        'process-arrow': generateProcessArrow,
        'bar-chart': generateBarChart,
        'highlight': generateHighlight,
        'swot': generateSwot,
        'roadmap': generateRoadmap,
        'comparison': generateComparison,
        'funnel': generateFunnel,
        'table': generateTable,
        'image-text': generateImageText,
        'agenda': generateAgenda,
      };

      const generator = typeGenerators[s.type];
      if (generator) {
        html += generator(s);
      } else {
        html += `<p style="font-size:1.4rem;line-height:1.8;opacity:0.9">${esc(s.body || '')}</p>`;
      }

      // 슬라이드 메모 아이콘 + 팝업
      if (s.notes) {
        html += `<button class="slide-note-btn" onclick="toggleSlideNote(this)" title="메모 보기">&#128221;</button>`;
        html += `<div class="slide-note-popup">${esc(s.notes)}</div>`;
      }
      html += watermarkHTML;
      html += `\n  </div>`;
      slideIndex++;
    }
  }

  // 엔딩
  if (data.ending) {
    const endingTitle = data.ending.title || '감사합니다';
    const contactHTML = data.ending.contact
      ? `<div class="ending-contact">${esc(data.ending.contact)}</div>`
      : data.ending.email || data.ending.phone
        ? `<div class="ending-contact">${data.ending.email ? `<span>${esc(data.ending.email)}</span>` : ''}${data.ending.phone ? `<span>${esc(data.ending.phone)}</span>` : ''}</div>`
        : '';

    html += `
  <div class="slide slide-ending" role="tabpanel">
    <h2><span class="typewriter-text">${esc(endingTitle)}</span></h2>
    ${data.ending.subtitle ? `<div class="ending-sub">${esc(data.ending.subtitle)}</div>` : ''}
    ${contactHTML}
    <div class="qr-area">
      <span class="qr-label">이 발표자료 공유</span>
      <span class="qr-url" id="shareUrl"></span>
    </div>
    <script>document.getElementById('shareUrl').textContent=window.location.href<\/script>
    ${watermarkHTML}
  </div>`;
  }

  return html;
}

function generateSVGIllust(type) {
  const illusts = {
    bullets: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <circle cx="150" cy="150" r="120" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <circle cx="150" cy="150" r="80" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <circle cx="150" cy="150" r="40" fill="currentColor" opacity="0.08"/>
      <rect x="80" y="90" width="140" height="12" rx="6" fill="currentColor" opacity="0.15"/>
      <rect x="80" y="120" width="110" height="12" rx="6" fill="currentColor" opacity="0.12"/>
      <rect x="80" y="150" width="130" height="12" rx="6" fill="currentColor" opacity="0.1"/>
      <rect x="80" y="180" width="100" height="12" rx="6" fill="currentColor" opacity="0.08"/>
      <circle cx="60" cy="96" r="8" fill="currentColor" opacity="0.2"/>
      <circle cx="60" cy="126" r="8" fill="currentColor" opacity="0.17"/>
      <circle cx="60" cy="156" r="8" fill="currentColor" opacity="0.14"/>
      <circle cx="60" cy="186" r="8" fill="currentColor" opacity="0.11"/>
    </svg></div>`,
    steps: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <path d="M60 250 L150 50 L240 250" stroke="currentColor" stroke-width="3" opacity="0.15" fill="none"/>
      <circle cx="60" cy="250" r="16" fill="currentColor" opacity="0.15"/>
      <circle cx="150" cy="50" r="16" fill="currentColor" opacity="0.25"/>
      <circle cx="240" cy="250" r="16" fill="currentColor" opacity="0.15"/>
      <circle cx="105" cy="150" r="10" fill="currentColor" opacity="0.12"/>
      <circle cx="195" cy="150" r="10" fill="currentColor" opacity="0.12"/>
      <line x1="60" y1="250" x2="105" y2="150" stroke="currentColor" stroke-width="2" opacity="0.1" stroke-dasharray="6"/>
      <line x1="105" y1="150" x2="150" y2="50" stroke="currentColor" stroke-width="2" opacity="0.1" stroke-dasharray="6"/>
      <line x1="150" y1="50" x2="195" y2="150" stroke="currentColor" stroke-width="2" opacity="0.1" stroke-dasharray="6"/>
      <line x1="195" y1="150" x2="240" y2="250" stroke="currentColor" stroke-width="2" opacity="0.1" stroke-dasharray="6"/>
    </svg></div>`,
    checklist: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <rect x="60" y="40" width="180" height="220" rx="16" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <rect x="60" y="40" width="180" height="40" rx="16" fill="currentColor" opacity="0.08"/>
      <rect x="80" y="100" width="16" height="16" rx="4" fill="currentColor" opacity="0.2"/>
      <path d="M84 108 L88 112 L96 104" stroke="currentColor" stroke-width="2.5" opacity="0.3"/>
      <rect x="110" y="102" width="100" height="10" rx="5" fill="currentColor" opacity="0.1"/>
      <rect x="80" y="135" width="16" height="16" rx="4" fill="currentColor" opacity="0.2"/>
      <path d="M84 143 L88 147 L96 139" stroke="currentColor" stroke-width="2.5" opacity="0.3"/>
      <rect x="110" y="137" width="80" height="10" rx="5" fill="currentColor" opacity="0.1"/>
      <rect x="80" y="170" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
      <rect x="110" y="172" width="110" height="10" rx="5" fill="currentColor" opacity="0.07"/>
      <rect x="80" y="205" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
      <rect x="110" y="207" width="90" height="10" rx="5" fill="currentColor" opacity="0.07"/>
    </svg></div>`,
    pyramid: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <polygon points="150,30 270,270 30,270" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <line x1="70" y1="190" x2="230" y2="190" stroke="currentColor" stroke-width="1.5" opacity="0.12"/>
      <line x1="100" y1="130" x2="200" y2="130" stroke="currentColor" stroke-width="1.5" opacity="0.12"/>
      <circle cx="150" cy="80" r="6" fill="currentColor" opacity="0.2"/>
      <circle cx="150" cy="160" r="5" fill="currentColor" opacity="0.15"/>
      <circle cx="150" cy="230" r="5" fill="currentColor" opacity="0.1"/>
    </svg></div>`,
    comparison: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <rect x="20" y="60" width="110" height="180" rx="12" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <rect x="170" y="60" width="110" height="180" rx="12" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <circle cx="150" cy="150" r="22" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <text x="150" y="156" text-anchor="middle" fill="currentColor" opacity="0.2" font-size="16" font-weight="bold">VS</text>
      <rect x="35" y="85" width="80" height="8" rx="4" fill="currentColor" opacity="0.1"/>
      <rect x="35" y="105" width="60" height="6" rx="3" fill="currentColor" opacity="0.07"/>
      <rect x="35" y="120" width="70" height="6" rx="3" fill="currentColor" opacity="0.07"/>
      <rect x="185" y="85" width="80" height="8" rx="4" fill="currentColor" opacity="0.1"/>
      <rect x="185" y="105" width="65" height="6" rx="3" fill="currentColor" opacity="0.07"/>
      <rect x="185" y="120" width="75" height="6" rx="3" fill="currentColor" opacity="0.07"/>
    </svg></div>`,
    funnel: `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
      <path d="M40 60 L260 60 L210 130 L200 180 L170 250 L130 250 L100 180 L90 130 Z" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <line x1="50" y1="90" x2="250" y2="90" stroke="currentColor" stroke-width="1.5" opacity="0.1"/>
      <line x1="80" y1="140" x2="220" y2="140" stroke="currentColor" stroke-width="1.5" opacity="0.1"/>
      <line x1="100" y1="190" x2="200" y2="190" stroke="currentColor" stroke-width="1.5" opacity="0.1"/>
      <circle cx="150" cy="75" r="5" fill="currentColor" opacity="0.2"/>
      <circle cx="150" cy="115" r="5" fill="currentColor" opacity="0.15"/>
      <circle cx="150" cy="165" r="5" fill="currentColor" opacity="0.12"/>
      <circle cx="150" cy="220" r="5" fill="currentColor" opacity="0.1"/>
    </svg></div>`
  };

  const fallback = `<div class="slide-image"><svg viewBox="0 0 300 300" fill="none">
    <circle cx="150" cy="150" r="100" stroke="currentColor" stroke-width="2" opacity="0.12"/>
    <circle cx="150" cy="150" r="60" stroke="currentColor" stroke-width="1.5" opacity="0.08" stroke-dasharray="8 4"/>
    <circle cx="150" cy="150" r="25" fill="currentColor" opacity="0.06"/>
    <circle cx="80" cy="80" r="30" fill="currentColor" opacity="0.04"/>
    <circle cx="220" cy="100" r="20" fill="currentColor" opacity="0.04"/>
    <circle cx="200" cy="230" r="25" fill="currentColor" opacity="0.03"/>
    <rect x="120" y="120" width="60" height="60" rx="12" fill="currentColor" opacity="0.05" transform="rotate(15 150 150)"/>
  </svg></div>`;

  return illusts[type] || fallback;
}

function esc(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escapeHtml = esc;

module.exports = { generateHTML };
