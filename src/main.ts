import './style.scss';
import './styles/home.scss';
import './styles/footer.scss';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Swiper from 'swiper';
import 'swiper/css';
import { initShared, reducedMotion, scrollToY } from './shared';

document.addEventListener('DOMContentLoaded', () => {
  initShared();
  initHero();
  initFeatureText();
  initServices();
  initSolutions();
  initProcess();
  initSecurity();
  initTestimonials();
  initFaq();
  initUptimeBars();
});


/* ============================================================
   HERO · carrusel guiado por el scroll
   Tras la intro, cada barra se llena con el scroll; al llenarse
   pasa a la siguiente imagen. Tras la 3ª, la página continúa.
   ============================================================ */
function initHero(): void {
  const navItems = Array.from(document.querySelectorAll<HTMLElement>('.carousel-nav .nav-item'));
  const fills = navItems.map(item => item.querySelector<HTMLElement>('.progress-fill'));
  const nav = document.querySelector<HTMLElement>('.carousel-nav');
  if (!document.querySelector('.scroll-track') || !navItems.length) return;

  const swiper = new Swiper('.mySwiper', {
    slidesPerView: 1,
    spaceBetween: 50,
    speed: 900,
    allowTouchMove: false,
  });

  const SLIDE = 2; // duración de cada barra, en unidades del timeline
  const tl = gsap.timeline({ paused: true });

  // En móvil el recuadro final es apaisado para que las imágenes (2:1) se vean enteras
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  tl.to('.hero-text', { opacity: 0, y: -50, duration: 1 })
    .to('.bg-overlay', { backgroundColor: 'rgba(3, 7, 18, 0.75)', duration: 1.5 }, '<')
    .to('.expandable-rect', {
      width: () => (isMobile() ? '92vw' : '95vw'),
      height: () => (isMobile() ? '54vw' : '75vh'),
      bottom: () => (isMobile() ? '30%' : '15%'),
      borderRadius: '20px',
      duration: 2,
      ease: 'power2.inOut'
    }, '<')
    .to('.carousel-nav', { opacity: 1, y: 0, duration: 1 }, '-=0.5');

  const starts: number[] = [];
  fills.forEach(fill => {
    starts.push(tl.duration() + 0.2);
    tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: SLIDE, ease: 'none' }, '+=0.2');
  });
  tl.to({}, { duration: 0.8 }); // pausa con la 3ª barra llena antes de soltar la sección

  let current = -1;
  const setActive = (index: number) => {
    if (index === current) return;
    current = index;
    swiper.slideTo(index);
    navItems.forEach((item, i) => {
      item.classList.toggle('active', i === index);
      item.classList.toggle('done', i < index);
    });
    // En móvil la fila de títulos tiene scroll horizontal: mantener visible el activo
    const item = navItems[index];
    if (nav && item && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: item.offsetLeft - 16, behavior: 'smooth' });
    }
  };

  // La diapositiva cambia cuando su barra está llena de verdad (tiempo del timeline, no del scroll)
  tl.eventCallback('onUpdate', () => {
    const time = tl.time();
    let index = 0;
    starts.forEach((start, i) => {
      if (i < starts.length - 1 && time >= start + SLIDE) index = i + 1;
    });
    setActive(index);
  });
  setActive(0);

  const trigger = ScrollTrigger.create({
    animation: tl,
    trigger: '.scroll-track',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.4,
    invalidateOnRefresh: true,
  });

  // Clic en un título: lleva el scroll al tramo de esa diapositiva
  navItems.forEach((item, i) => {
    item.addEventListener('click', () => {
      const time = i === 0 ? starts[0] : starts[i] + 0.02;
      scrollToY(trigger.start + (time / tl.duration()) * (trigger.end - trigger.start));
    });
  });
}


/* ---------- Texto que se ilumina palabra a palabra ---------- */
function initFeatureText(): void {
  const revealText = document.querySelector('.scroll-reveal-text');
  if (!revealText) return;

  const words = revealText.textContent?.split(' ') || [];
  revealText.innerHTML = '';
  words.forEach(word => {
    const span = document.createElement('span');
    span.textContent = word + ' ';
    revealText.appendChild(span);
  });

  gsap.to('.scroll-reveal-text span', {
    color: '#ffffff',
    stagger: 0.2,
    scrollTrigger: {
      trigger: '.features-section',
      start: 'top 65%',
      end: 'center 40%',
      scrub: 1,
    },
  });
}


/* ============================================================
   SERVICES · la pestaña activa y su barra siguen al scroll
   ============================================================ */
function initServices(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.services__tab'));
  const cards = tabs.map(tab => document.getElementById(tab.dataset.target || ''));
  if (!tabs.length || cards.some(card => !card)) return;

  const bars = tabs.map(tab => tab.querySelector<HTMLElement>('.services__bar b'));
  const setActive = (index: number) => tabs.forEach((tab, i) => tab.classList.toggle('is-active', i === index));

  cards.forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card,
      start: 'top 62%',
      end: 'bottom 62%',
      onToggle: self => { if (self.isActive) setActive(i); },
      onUpdate: self => { if (bars[i]) gsap.set(bars[i], { scaleX: self.progress }); },
    });
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      const card = cards[i]!;
      scrollToY(card.getBoundingClientRect().top + window.scrollY - 140);
    });
  });
}


/* ============================================================
   SOLUTIONS · pestañas con indicador deslizante
   ============================================================ */
function initSolutions(): void {
  const wrap = document.querySelector<HTMLElement>('.pill-tabs');
  const glider = wrap?.querySelector<HTMLElement>('.pill-tabs__glider');
  if (!wrap || !glider) return;

  const buttons = Array.from(wrap.querySelectorAll<HTMLButtonElement>('.pill-tabs__btn'));
  const activeButton = () => buttons.find(btn => btn.classList.contains('is-active')) ?? buttons[0];

  const moveGlider = (btn: HTMLElement) => {
    glider.style.width = `${btn.offsetWidth}px`;
    glider.style.transform = `translateX(${btn.offsetLeft}px)`;
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(other => {
        const on = other === btn;
        other.classList.toggle('is-active', on);
        other.setAttribute('aria-selected', String(on));
        const panel = document.getElementById(other.dataset.panel || '');
        panel?.classList.toggle('is-active', on);
        panel?.setAttribute('aria-hidden', String(!on));
      });
      moveGlider(btn);
    });
  });

  moveGlider(activeButton());
  window.addEventListener('resize', () => moveGlider(activeButton()));
  document.fonts?.ready.then(() => moveGlider(activeButton()));
}


/* ============================================================
   PROCESS · índice 01/02/03 y tarjetas que se oscurecen al apilarse
   ============================================================ */
function initProcess(): void {
  const stack = document.querySelector<HTMLElement>('.process__stack');
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.process__index > div'));
  const fills = labels.map(label => label.querySelector<HTMLElement>('b'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.step-card'));
  if (!stack || !labels.length) return;

  const steps = labels.length;

  ScrollTrigger.create({
    trigger: stack,
    start: 'top 70%',
    end: 'bottom bottom',
    onUpdate: self => {
      const p = self.progress * steps;
      const active = Math.min(steps - 1, Math.floor(p));
      labels.forEach((label, i) => {
        label.classList.toggle('is-active', i === active);
        if (fills[i]) gsap.set(fills[i], { scaleX: gsap.utils.clamp(0, 1, p - i) });
      });
      if (reducedMotion) return;
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        const depth = gsap.utils.clamp(0, 1, (p - i - 0.45) * 1.6);
        card.style.setProperty('--depth', depth.toFixed(3));
      });
    },
  });
}


/* ---------- Security: las capas de cristal se desplazan a distinta velocidad ---------- */
function initSecurity(): void {
  if (reducedMotion) return;
  gsap.utils.toArray<HTMLElement>('.panes i').forEach((pane, i) => {
    gsap.fromTo(pane,
      { yPercent: 10 + i * 7 },
      {
        yPercent: -6 - i * 5,
        ease: 'none',
        scrollTrigger: { trigger: '.security', start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
}


/* ---------- Testimonials ---------- */
function initTestimonials(): void {
  const el = document.querySelector<HTMLElement>('.testi-swiper');
  const wrapper = el?.querySelector('.swiper-wrapper');
  if (!el || !wrapper) return;

  // El modo loop necesita más diapositivas de las visibles: se duplican
  Array.from(wrapper.children).forEach(slide => {
    const clone = slide.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(clone);
  });

  const swiper = new Swiper(el, {
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 32,
    loop: true,
    speed: 900,
    grabCursor: true,
  });

  document.querySelectorAll<HTMLButtonElement>('.testi-nav__btn').forEach(btn => {
    btn.addEventListener('click', () => (btn.dataset.dir === 'prev' ? swiper.slidePrev() : swiper.slideNext()));
  });
}


/* ---------- FAQ: acordeón con altura animada ---------- */
function initFaq(): void {
  document.querySelectorAll<HTMLDetailsElement>('.faq-item').forEach(item => {
    const summary = item.querySelector('summary');
    const body = item.querySelector<HTMLElement>('.faq-item__body');
    if (!summary || !body) return;

    summary.addEventListener('click', event => {
      event.preventDefault();

      if (item.open) {
        item.classList.remove('is-open');
        gsap.to(body, {
          height: 0,
          duration: reducedMotion ? 0 : 0.45,
          ease: 'power2.inOut',
          onComplete: () => {
            item.open = false;
            gsap.set(body, { clearProps: 'height' });
          },
        });
      } else {
        item.open = true;
        item.classList.add('is-open');
        gsap.fromTo(body,
          { height: 0 },
          { height: 'auto', duration: reducedMotion ? 0 : 0.55, ease: 'power3.out', clearProps: 'height' }
        );
      }
    });
  });
}


/* ---------- Barras de disponibilidad del panel "Cloud & care" ---------- */
function initUptimeBars(): void {
  const container = document.querySelector('.vis-uptime__bars');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const bar = document.createElement('i');
    bar.style.height = `${62 + Math.round(Math.random() * 38)}%`;
    if (i === 17) bar.className = 'is-dip';
    container.appendChild(bar);
  }
}
