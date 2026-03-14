const fs = require('fs');
const path = require('path');

function generateHTML(data, options = {}) {
  const {
    theme = 'modern',
    title = 'AI 교육',
  } = options;

  const themes = {
    modern: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#0a0f1a', slideBg: '#0f172a', text: '#f1f5f9',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed',
      cardBg: 'rgba(37,99,235,0.08)', cardBorder: 'rgba(37,99,235,0.2)',
      glowColor: '37,99,235'
    },
    light: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#f0f4f8', slideBg: '#ffffff', text: '#1e293b',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed',
      cardBg: 'rgba(37,99,235,0.05)', cardBorder: 'rgba(37,99,235,0.15)',
      glowColor: '37,99,235'
    },
    dark: {
      primary: '#8b5cf6', secondary: '#6d28d9', accent: '#a78bfa',
      bg: '#09090b', slideBg: '#0f172a', text: '#f1f5f9',
      gradientFrom: '#8b5cf6', gradientTo: '#ec4899',
      cardBg: 'rgba(139,92,246,0.08)', cardBorder: 'rgba(139,92,246,0.2)',
      glowColor: '139,92,246'
    },
    corporate: {
      primary: '#0f766e', secondary: '#115e59', accent: '#14b8a6',
      bg: '#021a19', slideBg: '#042f2e', text: '#f0fdfa',
      gradientFrom: '#0f766e', gradientTo: '#0284c7',
      cardBg: 'rgba(15,118,110,0.1)', cardBorder: 'rgba(20,184,166,0.2)',
      glowColor: '20,184,166'
    },
    warm: {
      primary: '#ea580c', secondary: '#c2410c', accent: '#f97316',
      bg: '#120e0b', slideBg: '#1c1917', text: '#fafaf9',
      gradientFrom: '#ea580c', gradientTo: '#dc2626',
      cardBg: 'rgba(234,88,12,0.08)', cardBorder: 'rgba(249,115,22,0.2)',
      glowColor: '249,115,22'
    }
  };

  const t = themes[theme] || themes.modern;
  const slidesHTML = generateSlidesHTML(data, t);

  return `<!DOCTYPE html>
<html lang="ko">
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
.slide.active{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
.slide.prev{opacity:0;transform:scale(1.02) translateY(-30px)}

/* ===== 장식 요소 ===== */
.deco-circle{
  position:absolute;border-radius:50%;
  background:radial-gradient(circle,rgba(var(--glow),0.12),transparent 70%);
  pointer-events:none;filter:blur(40px);
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
  font-size:clamp(3rem,6vw,5.5rem);font-weight:900;line-height:1.15;
  margin-bottom:16px;z-index:1;
  opacity:0;transform:translateY(40px);
}
.slide-cover.active h1{animation:coverTitle 1s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide-cover .accent-line{
  width:0;height:5px;background:rgba(255,255,255,0.4);margin:20px 0;
  border-radius:3px;z-index:1;
}
.slide-cover.active .accent-line{animation:lineExpand 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s forwards}
.slide-cover .subtitle{
  font-size:clamp(1.2rem,2.2vw,2rem);color:rgba(255,255,255,0.85);z-index:1;
  opacity:0;transform:translateY(20px);
}
.slide-cover.active .subtitle{animation:fadeUp 0.8s ease 0.7s forwards}
.slide-cover .presenter{
  font-size:1.2rem;margin-top:50px;color:rgba(255,255,255,0.5);z-index:1;
  opacity:0;
}
.slide-cover.active .presenter{animation:fadeUp 0.8s ease 1s forwards}

/* ===== 섹션 구분 ===== */
.slide-section{
  background:linear-gradient(135deg,var(--secondary),var(--primary));
  padding:80px 100px;position:relative;overflow:hidden;
}
.slide-section .section-num{
  font-size:min(22vw,280px);font-weight:900;
  position:absolute;right:60px;bottom:30px;
  opacity:0.06;line-height:1;
}
.slide-section h2{
  font-size:clamp(2.5rem,5vw,4.2rem);font-weight:800;
  opacity:0;transform:translateX(-30px);
}
.slide-section.active h2{animation:slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide-section .section-desc{
  font-size:clamp(1.1rem,1.8vw,1.6rem);margin-top:20px;opacity:0;
  color:rgba(255,255,255,0.65);
}
.slide-section.active .section-desc{animation:fadeUp 0.7s ease 0.5s forwards}

/* ===== 내용 슬라이드 ===== */
.slide-content{padding:60px 100px;justify-content:flex-start;position:relative;overflow:visible}
.slide-content::before{
  content:'';position:absolute;top:0;left:0;width:100%;height:5px;
  background:linear-gradient(90deg,var(--primary),var(--accent),var(--gradient-to));
}
.slide-content h2{
  font-size:clamp(1.8rem,3.5vw,2.8rem);color:var(--primary);font-weight:800;margin-bottom:6px;
}
.slide-content .title-line{
  width:50px;height:4px;background:var(--accent);margin-bottom:40px;border-radius:2px;
}

/* ===== 불릿 ===== */
.bullet-list{list-style:none;padding:0;display:flex;flex-direction:column;gap:16px}
.bullet-list li{
  display:flex;align-items:center;gap:18px;
  font-size:clamp(1.1rem,1.8vw,1.6rem);line-height:1.5;
  padding:14px 24px;border-radius:14px;
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
.bullet-icon{
  width:38px;height:38px;min-width:38px;border-radius:10px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:0.9rem;color:#fff;
}

/* ===== 카드 ===== */
.cards-container{display:flex;gap:24px;flex:1;align-items:stretch}
.card{
  flex:1;border-radius:20px;padding:32px;position:relative;overflow:hidden;
  background:var(--card-bg);border:1px solid var(--card-border);
  backdrop-filter:blur(8px);
  opacity:0;transform:translateY(40px) scale(0.95);
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
  font-size:clamp(1.1rem,1.6vw,1.5rem);color:var(--primary);
  margin-bottom:14px;font-weight:700;position:relative;z-index:1;
}
.card p,.card li{
  font-size:clamp(0.95rem,1.3vw,1.2rem);line-height:1.7;opacity:0.85;
  position:relative;z-index:1;
}
.card ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:6px}
.card ul li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:10px;vertical-align:middle}

/* ===== 스텝/타임라인 ===== */
.steps-container{display:flex;flex-direction:column;gap:8px;flex:1;justify-content:center;position:relative}
.steps-container::before{
  content:'';position:absolute;left:28px;top:30px;bottom:30px;width:3px;
  background:linear-gradient(to bottom,var(--primary),var(--accent));
  border-radius:2px;opacity:0.25;
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
  width:56px;height:56px;min-width:56px;border-radius:16px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:1.2rem;color:#fff;
  box-shadow:0 4px 20px rgba(var(--glow),0.3);
  position:relative;z-index:1;
}
.step-body h4{
  font-size:clamp(1.1rem,1.7vw,1.5rem);font-weight:700;margin-bottom:4px;
}
.step-body p{
  font-size:clamp(0.95rem,1.3vw,1.15rem);opacity:0.6;
}

/* ===== 2컬럼 비교 ===== */
.two-col{display:flex;gap:20px;flex:1;align-items:stretch}
.col{
  flex:1;padding:28px;border-radius:20px;
  background:var(--card-bg);border:1px solid var(--card-border);
  position:relative;overflow:hidden;
  opacity:0;
}
.col::before{
  content:'';position:absolute;top:0;left:0;right:0;height:4px;
}
.col:first-child::before{background:linear-gradient(90deg,#ef4444,#f97316)}
.col:last-child::before{background:linear-gradient(90deg,#22c55e,#14b8a6)}
.slide.active .col:first-child{animation:slideFromLeft 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide.active .col:last-child{animation:slideFromRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards}
.col h3{
  font-size:clamp(1.1rem,1.6vw,1.5rem);font-weight:700;margin-bottom:18px;
  display:flex;align-items:center;gap:10px;
}
.col:first-child h3{color:#f97316}
.col:last-child h3{color:#22c55e}
.col .bullet-list{gap:10px}
.col .bullet-list li{
  font-size:clamp(0.95rem,1.3vw,1.2rem);padding:10px 16px;
  background:transparent;border:none;backdrop-filter:none;
}
.col:first-child .bullet-icon{background:linear-gradient(135deg,#ef4444,#f97316)}
.col:last-child .bullet-icon{background:linear-gradient(135deg,#22c55e,#14b8a6)}
.vs-badge{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;
  width:56px;height:56px;border-radius:50%;
  background:var(--slide-bg);border:3px solid var(--card-border);
  display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:1rem;color:var(--accent);
}

/* ===== 숫자 통계 (인포그래픽) ===== */
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
.stat-label{
  font-size:clamp(0.9rem,1.3vw,1.2rem);opacity:0.6;margin-top:8px;display:block;
}
.stat-ring{
  width:80px;height:80px;margin:0 auto 12px;position:relative;
}
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
  background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:2px;opacity:0.3;
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
.check-icon.done{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}
.check-icon.todo{background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);color:transparent}

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
  font-size:clamp(0.9rem,1.3vw,1.2rem);opacity:0.5;
  opacity:0;
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
  height:100%;border-radius:6px;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  transform:scaleX(0);transform-origin:left;
  transition:transform 1.5s cubic-bezier(0.16,1,0.3,1);
}
.slide.active .progress-fill{transform:scaleX(1)}

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
.matrix-label-x,.matrix-label-y{position:absolute;font-size:0.8rem;opacity:0.4;font-weight:600}

/* ===== 순환 다이어그램 ===== */
.cycle-container{display:flex;align-items:center;justify-content:center;flex:1;position:relative}
.cycle-ring{position:relative;width:clamp(350px,45vw,500px);height:clamp(350px,45vw,500px)}
.cycle-node{
  position:absolute;width:clamp(100px,14vw,140px);padding:16px;border-radius:16px;
  background:var(--card-bg);border:1px solid var(--card-border);text-align:center;
  transform:translate(-50%,-50%);opacity:0;
  backdrop-filter:blur(8px);
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
  text-align:center;padding:30px 80px;
}
.hl-icon{
  width:80px;height:80px;border-radius:24px;margin-bottom:24px;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-size:2rem;color:#fff;
  box-shadow:0 8px 40px rgba(var(--glow),0.3);
  opacity:0;transform:scale(0.5);
}
.slide.active .hl-icon{animation:popScale 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards}
.hl-main{
  font-size:clamp(1.6rem,3vw,2.8rem);font-weight:800;line-height:1.4;
  margin-bottom:16px;opacity:0;
}
.slide.active .hl-main{animation:fadeUp 0.7s ease 0.3s forwards}
.hl-sub{font-size:clamp(1rem,1.5vw,1.3rem);opacity:0;color:rgba(255,255,255,0.5)}
.slide.active .hl-sub{animation:fadeUp 0.6s ease 0.5s forwards}

/* ===== SWOT ===== */
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1}
.swot-cell{
  padding:24px;border-radius:16px;position:relative;overflow:hidden;
  opacity:0;transform:scale(0.9);
}
.swot-cell:nth-child(1){background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25)}
.swot-cell:nth-child(2){background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.25)}
.swot-cell:nth-child(3){background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25)}
.swot-cell:nth-child(4){background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25)}
.slide.active .swot-cell{animation:statPop 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
.slide.active .swot-cell:nth-child(1){animation-delay:0.1s}
.slide.active .swot-cell:nth-child(2){animation-delay:0.2s}
.slide.active .swot-cell:nth-child(3){animation-delay:0.3s}
.slide.active .swot-cell:nth-child(4){animation-delay:0.4s}
.swot-cell h4{font-size:clamp(1rem,1.5vw,1.3rem);font-weight:800;margin-bottom:10px}
.swot-cell:nth-child(1) h4{color:#22c55e}
.swot-cell:nth-child(2) h4{color:#eab308}
.swot-cell:nth-child(3) h4{color:#ef4444}
.swot-cell:nth-child(4) h4{color:#3b82f6}
.swot-cell ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:4px}
.swot-cell li{font-size:clamp(0.8rem,1.1vw,1rem);opacity:0.8;line-height:1.5}
.swot-cell li::before{content:'•';margin-right:8px;opacity:0.4}

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
.rm-card{
  padding:16px;border-radius:12px;background:var(--card-bg);border:1px solid var(--card-border);width:100%;
}
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
  font-size:clamp(2.5rem,6vw,5rem);font-weight:900;color:#fff;z-index:1;
  opacity:0;transform:scale(0.9);
}
.slide-ending.active h2{animation:popScale 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards}
.slide-ending .ending-sub{
  font-size:clamp(1rem,1.8vw,1.6rem);margin-top:20px;opacity:0;color:rgba(255,255,255,0.7);z-index:1;
}
.slide-ending.active .ending-sub{animation:fadeUp 0.8s ease 0.6s forwards}

/* ===== 네비게이션 ===== */
.nav-bar{
  position:fixed;bottom:0;left:0;right:0;height:50px;
  background:rgba(0,0,0,0.4);backdrop-filter:blur(12px);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 30px;z-index:100;
}
.nav-bar .progress-bar{
  position:absolute;top:0;left:0;height:3px;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  transition:width 0.5s ease;
}
.nav-btn{
  background:none;border:none;color:rgba(255,255,255,0.6);font-size:0.9rem;
  cursor:pointer;padding:8px 18px;border-radius:8px;transition:all 0.2s;
  font-family:'Noto Sans KR',sans-serif;
}
.nav-btn:hover{background:rgba(255,255,255,0.1);color:#fff}
.slide-counter{font-size:0.85rem;opacity:0.5}
.fullscreen-btn{
  position:fixed;top:15px;right:15px;z-index:101;
  background:rgba(0,0,0,0.3);border:none;color:rgba(255,255,255,0.5);
  width:42px;height:42px;border-radius:10px;cursor:pointer;font-size:1.3rem;
  backdrop-filter:blur(5px);transition:all 0.2s;
}
.fullscreen-btn:hover{background:rgba(0,0,0,0.5);color:#fff}

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
</style>
</head>
<body>
<div class="presentation" id="presentation">
${slidesHTML}
</div>

<div class="nav-bar">
  <div class="progress-bar" id="progressBar"></div>
  <button class="nav-btn" onclick="prevSlide()">&#8592; 이전</button>
  <span class="slide-counter" id="slideCounter">1 / 1</span>
  <button class="nav-btn" onclick="nextSlide()">다음 &#8594;</button>
</div>
<button class="fullscreen-btn" onclick="toggleFullscreen()" title="전체화면">&#x26F6;</button>

<script>
let current=0;
const slides=document.querySelectorAll('.slide');
const total=slides.length;

function showSlide(idx){
  slides.forEach((s,i)=>{
    s.classList.remove('active','prev');
    if(i<idx) s.classList.add('prev');
  });
  // 애니메이션 리셋: active 제거 후 reflow 강제, 다시 추가
  const target=slides[idx];
  void target.offsetWidth;
  target.classList.add('active');
  // 내부 애니메이션 요소 리셋
  target.querySelectorAll('.bullet-list li,.card,.step,.stat-item,.col,.tl-item,.checklist li,.quote-mark,.quote-text,.quote-author,.progress-item,.pyramid-level,.ig-item,.donut-item,.matrix-cell,.cycle-node,.chevron,.bar-item,.hl-icon,.hl-main,.hl-sub,.swot-cell,.rm-phase').forEach(el=>{
    el.style.animation='none';
    void el.offsetWidth;
    el.style.animation='';
  });
  current=idx;
  document.getElementById('slideCounter').textContent=(current+1)+' / '+total;
  document.getElementById('progressBar').style.width=((current+1)/total*100)+'%';
  // 카운트업
  target.querySelectorAll('.count-up').forEach(el=>{
    const t=parseInt(el.dataset.target);
    const s=el.dataset.suffix||'';
    animateCount(el,0,t,1800,s);
  });
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

document.addEventListener('keydown',e=>{
  if(['ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();nextSlide()}
  if(['ArrowLeft','Backspace'].includes(e.key)){e.preventDefault();prevSlide()}
  if(e.key==='f'||e.key==='F')toggleFullscreen();
  if(e.key==='Home')showSlide(0);
  if(e.key==='End')showSlide(total-1);
});

let tx=0;
document.addEventListener('touchstart',e=>tx=e.touches[0].clientX);
document.addEventListener('touchend',e=>{
  const d=tx-e.changedTouches[0].clientX;
  if(Math.abs(d)>50){d>0?nextSlide():prevSlide()}
});

showSlide(0);
</script>
</body>
</html>`;
}

function generateSlidesHTML(data, t) {
  let html = '';

  // 표지
  if (data.cover) {
    html += `
  <div class="slide slide-cover">
    <h1>${esc(data.cover.title)}</h1>
    <div class="accent-line"></div>
    ${data.cover.subtitle ? `<div class="subtitle">${esc(data.cover.subtitle)}</div>` : ''}
    ${data.cover.presenter ? `<div class="presenter">${esc(data.cover.presenter)}</div>` : ''}
  </div>`;
  }

  // 목차
  if (data.toc && data.toc.length > 0) {
    html += `
  <div class="slide slide-content">
    <div class="top-bar"></div>
    <h2>목차</h2>
    <div class="title-line"></div>
    <div class="steps-container">
      ${data.toc.map((item, i) => `
      <div class="step">
        <div class="step-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="step-body"><h4>${esc(item)}</h4></div>
      </div>`).join('')}
    </div>
  </div>`;
  }

  // 내용
  if (data.content) {
    for (const s of data.content) {
      if (s.isSection) {
        html += `
  <div class="slide slide-section">
    <span class="section-num">${esc(s.sectionNumber || '')}</span>
    <h2>${esc(s.title)}</h2>
    ${s.description ? `<div class="section-desc">${esc(s.description)}</div>` : ''}
  </div>`;
        continue;
      }

      html += `
  <div class="slide slide-content">
    <h2>${esc(s.title)}</h2>
    <div class="title-line"></div>`;

      if (s.type === 'bullets') {
        html += `
    <ul class="bullet-list">
      ${(s.items || []).map((item, i) => `
      <li>
        <span class="bullet-icon">${String(i + 1).padStart(2, '0')}</span>
        <span>${esc(item)}</span>
      </li>`).join('')}
    </ul>`;
      }
      else if (s.type === 'cards') {
        html += `
    <div class="cards-container">
      ${(s.cards || []).map((c, i) => {
        const icons = ['&#9670;', '&#9679;', '&#9733;', '&#9830;'];
        return `
      <div class="card">
        <div class="card-icon">${icons[i % icons.length]}</div>
        <h3>${esc(c.title)}</h3>
        ${c.items
          ? `<ul>${c.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>`
          : `<p>${esc(c.body || '')}</p>`}
      </div>`;
      }).join('')}
    </div>`;
      }
      else if (s.type === 'steps') {
        html += `
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
      else if (s.type === 'two-column') {
        html += `
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
      else if (s.type === 'stats') {
        html += `
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
      else if (s.type === 'timeline') {
        html += `
    <div class="timeline">
      ${(s.events || []).map(ev => `
      <div class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-year">${esc(ev.year || ev.label || '')}</div>
        <div class="tl-desc">${esc(ev.desc || ev.text || '')}</div>
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'checklist') {
        html += `
    <ul class="checklist">
      ${(s.items || []).map(item => {
        const isObj = typeof item === 'object';
        const text = isObj ? item.text : item;
        const done = isObj ? item.done !== false : true;
        return `
      <li>
        <span class="check-icon ${done ? 'done' : 'todo'}">${done ? '&#10003;' : ''}</span>
        <span>${esc(text)}</span>
      </li>`;
      }).join('')}
    </ul>`;
      }
      else if (s.type === 'quote') {
        html += `
    <div class="quote-container">
      <div class="quote-mark">&ldquo;</div>
      <div class="quote-text">${esc(s.quote || s.body || '')}</div>
      <div class="quote-author">&mdash; ${esc(s.author || '')}</div>
    </div>`;
      }
      else if (s.type === 'progress') {
        html += `
    <div class="progress-list">
      ${(s.items || []).map(item => `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">${esc(item.label)}</span>
          <span class="progress-value">${item.value}${esc(item.suffix || '%')}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${Math.min(item.value, 100)}%"></div>
        </div>
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'pyramid') {
        const levels = s.levels || [];
        html += `
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
      else if (s.type === 'icon-grid') {
        const icons = ['&#9670;','&#9733;','&#9679;','&#9830;','&#10070;','&#10022;'];
        html += `
    <div class="icon-grid">
      ${(s.items || []).map((item, i) => `
      <div class="ig-item">
        <div class="ig-icon">${item.icon || icons[i % icons.length]}</div>
        <div class="ig-title">${esc(item.title)}</div>
        <div class="ig-desc">${esc(item.desc || '')}</div>
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'donut') {
        html += `
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
      else if (s.type === 'matrix') {
        const cells = s.cells || [];
        html += `
    <div class="matrix-grid">
      ${cells.slice(0, 4).map(c => `
      <div class="matrix-cell">
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.body || '')}</p>
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'cycle') {
        const nodes = s.nodes || [];
        const n = nodes.length;
        const arrows = ['&#8594;','&#8600;','&#8592;','&#8598;','&#8595;','&#8593;'];
        html += `
    <div class="cycle-container">
      <div class="cycle-ring">
        ${nodes.map((nd, i) => {
          const angle = (2 * Math.PI * i / n) - Math.PI / 2;
          const r = 45;
          const x = 50 + r * Math.cos(angle);
          const y = 50 + r * Math.sin(angle);
          const aAngle = (2 * Math.PI * (i + 0.5) / n) - Math.PI / 2;
          const ax = 50 + (r - 5) * Math.cos(aAngle);
          const ay = 50 + (r - 5) * Math.sin(aAngle);
          return `
        <div class="cycle-node" style="left:${x}%;top:${y}%;animation-delay:${0.1 + i * 0.15}s">
          <h4>${esc(typeof nd === 'string' ? nd : nd.title)}</h4>
          ${nd.desc ? `<p>${esc(nd.desc)}</p>` : ''}
        </div>
        <div class="cycle-arrow" style="left:${ax}%;top:${ay}%">&#10140;</div>`;
        }).join('')}
      </div>
    </div>`;
      }
      else if (s.type === 'process-arrow') {
        html += `
    <div class="chevron-container">
      ${(s.steps || []).map((st, i) => `
      <div class="chevron">
        <h4>${esc(typeof st === 'string' ? st : st.title)}</h4>
        ${st.desc ? `<p>${esc(st.desc)}</p>` : ''}
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'bar-chart') {
        const items = s.items || [];
        const maxVal = Math.max(...items.map(it => it.value), 1);
        html += `
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
      else if (s.type === 'highlight') {
        html += `
    <div class="highlight-box">
      <div class="hl-icon">${esc(s.icon || '!')}</div>
      <div class="hl-main">${esc(s.body || s.message || '')}</div>
      <div class="hl-sub">${esc(s.sub || '')}</div>
    </div>`;
      }
      else if (s.type === 'swot') {
        const cells = [
          { key: 'strengths', label: 'Strengths', items: s.strengths || [] },
          { key: 'weaknesses', label: 'Weaknesses', items: s.weaknesses || [] },
          { key: 'opportunities', label: 'Opportunities', items: s.opportunities || [] },
          { key: 'threats', label: 'Threats', items: s.threats || [] }
        ];
        html += `
    <div class="swot-grid">
      ${cells.map(c => `
      <div class="swot-cell">
        <h4>${c.label}</h4>
        <ul>${c.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>`;
      }
      else if (s.type === 'roadmap') {
        html += `
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
      else {
        html += `<p style="font-size:1.4rem;line-height:1.8;opacity:0.9">${esc(s.body || '')}</p>`;
      }

      html += `\n  </div>`;
    }
  }

  // 엔딩
  if (data.ending) {
    html += `
  <div class="slide slide-ending">
    <h2>${esc(data.ending.title || '감사합니다')}</h2>
    ${data.ending.subtitle ? `<div class="ending-sub">${esc(data.ending.subtitle)}</div>` : ''}
  </div>`;
  }

  return html;
}

function esc(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escapeHtml = esc;

module.exports = { generateHTML };
