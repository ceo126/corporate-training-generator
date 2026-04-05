/* ==========================================================================
   Common JavaScript Utilities - 기업교육 발표자료 생성기
   Shared JS extracted from all HTML pages
   ========================================================================== */

// ---------- XSS Prevention ----------
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Toast Notifications ----------
function showToast(message, type) {
  type = type || 'info';
  var toast = document.createElement('div');
  toast.className = 'common-toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

// ---------- Formatters ----------
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  var units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatDate(date) {
  if (!date) return '-';
  var d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var h = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + day + ' ' + h + ':' + min;
}

// ---------- Fetch Wrapper ----------
async function fetchJSON(url, options) {
  options = options || {};
  try {
    var res = await fetch(url, options);
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || ('HTTP ' + res.status));
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// ---------- Utility Functions ----------
function debounce(fn, ms) {
  var timer;
  return function() {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(context, args);
    }, ms);
  };
}

function throttle(fn, ms) {
  var lastCall = 0;
  return function() {
    var now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, arguments);
    }
  };
}

// ---------- JSON Syntax Highlighting ----------
function syntaxHighlightJSON(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  return escHtml(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function(match) {
      var cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

// ---------- Navigation Bar Rendering ----------
function renderNav(activePage) {
  var pages = [
    { id: 'home', href: '/', label: '홈' },
    { id: 'editor', href: '/editor', label: '슬라이드 에디터' },
    { id: 'templates', href: '/templates', label: '템플릿 갤러리' },
    { id: 'presenter', href: '/presenter', label: '발표자 모드' },
    { id: 'api-docs', href: '/api-docs', label: 'API 문서' }
  ];

  var html = '';
  pages.forEach(function(page) {
    var activeClass = (page.id === activePage) ? ' class="active"' : '';
    html += '<a href="' + page.href + '"' + activeClass + ' aria-label="' + escHtml(page.label) + '">' + escHtml(page.label) + '</a>';
  });

  // Find all nav containers and populate
  var navs = document.querySelectorAll('.header-nav[data-nav]');
  navs.forEach(function(nav) {
    nav.innerHTML = html;
  });

  return html;
}

// ---------- Theme Toggle Logic ----------
var _themeToggleCallbacks = [];

function initTheme() {
  var saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  _updateThemeUI(saved);
}

function toggleTheme() {
  var html = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  var newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  _updateThemeUI(newTheme);
  _themeToggleCallbacks.forEach(function(cb) { cb(newTheme); });
}

function onThemeChange(callback) {
  _themeToggleCallbacks.push(callback);
}

function _updateThemeUI(theme) {
  var icon = document.getElementById('themeIcon');
  var label = document.getElementById('themeLabel');
  if (icon) {
    if (theme === 'dark') {
      // Moon icon or emoji
      if (icon.querySelector('svg')) {
        // Keep existing SVG
      } else {
        icon.innerHTML = '&#127769;';
      }
    } else {
      if (icon.querySelector('svg')) {
        // Keep existing SVG
      } else {
        icon.innerHTML = '&#9728;';
      }
    }
  }
  if (label) {
    label.textContent = theme === 'dark' ? '다크 모드' : '라이트 모드';
  }
}

// ---------- Keyboard Shortcut Manager ----------
var _keyboardShortcuts = {};

function registerShortcut(key, callback, options) {
  options = options || {};
  _keyboardShortcuts[key] = {
    callback: callback,
    ctrl: !!options.ctrl,
    meta: !!options.meta,
    shift: !!options.shift,
    alt: !!options.alt,
    preventDefault: options.preventDefault !== false
  };
}

document.addEventListener('keydown', function(e) {
  // Skip if typing in input/textarea
  var tag = e.target.tagName;
  var isEditable = e.target.isContentEditable;
  var isInput = tag === 'INPUT' || tag === 'TEXTAREA' || isEditable;

  for (var key in _keyboardShortcuts) {
    var shortcut = _keyboardShortcuts[key];
    var keyMatch = e.key === key || e.key.toLowerCase() === key.toLowerCase();

    if (!keyMatch) continue;
    if (shortcut.ctrl && !e.ctrlKey) continue;
    if (shortcut.meta && !e.metaKey) continue;
    if (shortcut.shift && !e.shiftKey) continue;
    if (shortcut.alt && !e.altKey) continue;

    // For shortcuts without modifiers, skip if in input
    if (!shortcut.ctrl && !shortcut.meta && !shortcut.alt && isInput) continue;

    if (shortcut.preventDefault) e.preventDefault();
    shortcut.callback(e);
    return;
  }
});

// ---------- Auto-init ----------
// Initialize theme on load
initTheme();
