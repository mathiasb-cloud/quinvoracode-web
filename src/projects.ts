import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import { reducedMotion } from './shared';

/* ============================================================
   SELECTED WORK
   Escenario fijado: cada proyecto se muestra en una ventana de
   navegador cuya página se desplaza con el scroll; después la
   siguiente tarjeta sube y las anteriores retroceden en pila.
   ============================================================ */
export function initProjects(): void {
  const section = document.querySelector<HTMLElement>('.work');
  const stage = section?.querySelector<HTMLElement>('.work__stage');
  if (!section || !stage) return;

  const projects = Array.from(stage.querySelectorAll<HTMLElement>('.project'));
  if (!projects.length) return;

  const counter = section.querySelector<HTMLElement>('[data-count]');
  const pad = (n: number) => String(n).padStart(2, '0');

  if (reducedMotion) {
    if (counter) counter.textContent = pad(projects.length);
    stage.classList.add('is-static');
    return;
  }

  // ---------- Cabecera ----------
  const title = section.querySelector<HTMLElement>('.work__title');
  if (title) {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', autoSplit: true });
    gsap.from(split.lines, {
      yPercent: 120,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.1,
      scrollTrigger: { trigger: title, start: 'top 85%' },
    });
  }

  gsap.from(section.querySelectorAll('.work__eyebrow, .work__lede, .work__meta'), {
    y: 24,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.work__head', start: 'top 78%' },
  });

  gsap.to(section.querySelector('.work__rule'), {
    scaleX: 1,
    duration: 1.4,
    ease: 'power3.inOut',
    scrollTrigger: { trigger: '.work__head', start: 'top 70%' },
  });

  if (counter) {
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: projects.length,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => { counter.textContent = pad(Math.round(proxy.v)); },
      scrollTrigger: { trigger: '.work__head', start: 'top 75%' },
    });
  }

  // ---------- Medidas de cada navegador ----------
  const parts = projects.map(project => ({
    project,
    shot: project.querySelector<HTMLImageElement>('.project__shot')!,
    viewport: project.querySelector<HTMLElement>('.project__viewport')!,
    track: project.querySelector<HTMLElement>('.project__scrollbar')!,
    thumb: project.querySelector<HTMLElement>('.project__scrollbar i')!,
    shade: project.querySelector<HTMLElement>('.project__shade')!,
    reveals: project.querySelectorAll<HTMLElement>('.project__reveal'),
  }));

  // Cuánto sobra de la captura respecto a la ventana: eso es lo que se desplaza
  const panOf = (p: typeof parts[number]) => Math.max(0, p.shot.offsetHeight - p.viewport.clientHeight);

  const thumbTravel = (p: typeof parts[number]) => p.track.clientHeight - p.thumb.offsetHeight;

  const measure = () => {
    parts.forEach(p => {
      const ratio = p.shot.offsetHeight ? p.viewport.clientHeight / p.shot.offsetHeight : 1;
      p.thumb.style.height = `${Math.min(100, Math.max(12, ratio * 100))}%`;
      p.project.classList.toggle('no-scroll', panOf(p) < 4);
    });
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  parts.forEach(p => {
    if (!p.shot.complete) p.shot.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });

  // ---------- Timeline del escenario ----------
  const DEPTH_Y = 16;   // px que sube cada tarjeta al quedar detrás
  const DEPTH_SCALE = 0.05;

  gsap.set(projects.slice(1), { yPercent: 115 });

  const tl = gsap.timeline({ defaults: { ease: 'none' } });

  parts.forEach((p, i) => {
    // 1 · La página se recorre dentro del navegador
    tl.to(p.shot, { y: () => -panOf(p), duration: 1.5 })
      .to(p.thumb, { y: () => thumbTravel(p), duration: 1.5 }, '<');

    const next = parts[i + 1];
    if (!next) return;

    // 2 · Entra la siguiente tarjeta; las anteriores retroceden un nivel
    const label = `swap${i}`;
    tl.addLabel(label, '+=0.15')
      .to(next.project, { yPercent: 0, duration: 1, ease: 'power2.inOut' }, label)
      .from(next.reveals, { y: 40, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }, `${label}+=0.45`);

    for (let j = 0; j <= i; j++) {
      const depth = i + 1 - j;
      tl.to(parts[j].project, {
        scale: 1 - depth * DEPTH_SCALE,
        y: -depth * DEPTH_Y,
        autoAlpha: depth > 2 ? 0 : 1,
        duration: 1,
        ease: 'power2.inOut',
      }, label)
        .to(parts[j].shade, { opacity: Math.min(0.35 + depth * 0.2, 0.8), duration: 1, ease: 'power2.inOut' }, label);
    }
  });

  tl.to({}, { duration: 0.4 }); // respiro final antes de soltar el escenario

  ScrollTrigger.create({
    animation: tl,
    trigger: stage,
    start: 'top top',
    end: () => `+=${projects.length * window.innerHeight * 1.15}`,
    pin: true,
    scrub: 1,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  });

  // Entrada del escenario: la primera tarjeta crece mientras llega
  gsap.fromTo(parts[0].project.querySelector('.project__card'),
    { scale: 0.9, opacity: 0.35 },
    {
      scale: 1,
      opacity: 1,
      ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top top', scrub: true },
    }
  );

  gsap.from(parts[0].reveals, {
    y: 40,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: stage, start: 'top 60%' },
  });
}
