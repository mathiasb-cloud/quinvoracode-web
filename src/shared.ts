/* ============================================================
   CÓDIGO COMPARTIDO ENTRE PÁGINAS
   Navbar, estrellas, scroll suave, apariciones y footer.
   ============================================================ */
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import { initConsent } from './consent';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- Scroll suave ----------
   La rueda del ratón no salta: el scroll real se interpola hacia el
   destino en cada frame. Como se sigue usando el scroll nativo de la
   ventana, sticky y ScrollTrigger funcionan igual. En táctil y con
   movimiento reducido se deja el scroll nativo. */
let smoothTo = (y: number) => window.scrollTo({ top: y, behavior: 'smooth' });

export const scrollToY = (y: number) => smoothTo(y);

function initSmoothScroll(): void {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

  const EASE = 0.085; // cuanto menor, más suave y largo
  let target = window.scrollY;
  let current = window.scrollY;
  let active = false;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const goTo = (y: number) => {
    if (!active) current = window.scrollY;
    target = Math.max(0, Math.min(maxScroll(), y));
    active = true;
  };
  smoothTo = goTo;

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || document.body.style.overflow === 'hidden') return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if ((event.target as Element).closest?.('[data-native-scroll]')) return;

    event.preventDefault();
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1;
    goTo((active ? target : window.scrollY) + event.deltaY * unit);
  }, { passive: false });

  // Teclado o arrastre de la barra: se cede el control al scroll nativo
  const release = () => {
    active = false;
    target = current = window.scrollY;
  };
  window.addEventListener('keydown', release);
  window.addEventListener('mousedown', release);

  gsap.ticker.add((_time, deltaTime) => {
    if (!active) return;
    const k = 1 - Math.pow(1 - EASE, deltaTime / 16.667);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.4) {
      current = target;
      active = false;
    }
    window.scrollTo(0, current);
  });

  // Enlaces internos (#seccion o /#seccion en esta misma página)
  document.addEventListener('click', event => {
    const link = (event.target as Element).closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (!link || link.pathname !== window.location.pathname) return;
    if (link.hash === '' || link.hash === '#') {
      if (link.getAttribute('href') === '#') event.preventDefault();
      return;
    }
    const section = document.querySelector<HTMLElement>(link.hash);
    if (!section) return;
    event.preventDefault();
    goTo(section.getBoundingClientRect().top + window.scrollY - 80);
    history.replaceState(null, '', link.hash);
  });
}


/* ---------- Navbar y menú móvil ---------- */
function initNavbar(): void {
  const navbar = document.querySelector('.navbar');
  const onScroll = () => navbar?.classList.toggle('scrolled', window.scrollY > 110);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav-overlay');

  menuToggle?.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileNav?.classList.toggle('active');
    document.body.style.overflow = mobileNav?.classList.contains('active') ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-nav-overlay a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle?.classList.remove('active');
      mobileNav?.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}


/* ---------- Estrellas del fondo ---------- */
function initStars(): void {
  const container = document.getElementById('stars-container');
  if (!container) return;

  const count = window.innerWidth < 768 ? 90 : 170;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    const bright = Math.random() < 0.14;
    star.className = bright ? 'star star--bright' : 'star';

    const size = bright ? Math.random() * 1.4 + 1.8 : Math.random() * 1.4 + 0.8;
    star.style.left = `${Math.random() * 100}vw`;
    star.style.top = `${Math.random() * 100}vh`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDuration = `${Math.random() * 4 + 3.5}s`;
    star.style.animationDelay = `${Math.random() * -8}s`;
    fragment.appendChild(star);
  }

  container.appendChild(fragment);
}


/* ---------- Apariciones al hacer scroll ---------- */
function initReveals(): void {
  if (reducedMotion) return;

  document.querySelectorAll<HTMLElement>('.sec-title').forEach(title => {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', autoSplit: true });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: title, start: 'top 88%' },
    });
  });

  document.querySelectorAll<HTMLElement>('.sec-eyebrow, .sec-lede').forEach(el => {
    gsap.from(el, {
      y: 18,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  gsap.set('[data-reveal]', { y: 36, opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: batch => gsap.to(batch, {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.09,
      overwrite: true,
    }),
  });
}


/* ---------- Footer: el nombre sube y se enciende al llegar ---------- */
function initFooter(): void {
  const mark = document.querySelector<HTMLElement>('.site-foot__mark');
  if (!mark || reducedMotion) return;

  gsap.timeline({
    scrollTrigger: { trigger: mark, start: 'top bottom', end: 'center 70%', scrub: 1.2 },
  })
    .from(mark.querySelector('.site-foot__word'), { yPercent: 35, opacity: 0.2, ease: 'none' })
    .from(mark.querySelector('.site-foot__glow'), { opacity: 0, scaleX: 0.6, ease: 'none' }, 0);
}


export function initShared(): void {
  initSmoothScroll();
  initNavbar();
  initStars();
  initReveals();
  initFooter();
  initConsent();
}
