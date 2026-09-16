import './style.scss';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Flip from 'gsap/Flip';
import SplitText from 'gsap/SplitText';
import Swiper from 'swiper';
import 'swiper/css';

gsap.registerPlugin(ScrollTrigger, Flip, SplitText);

document.addEventListener('DOMContentLoaded', () => {
  const swiper = new Swiper('.mySwiper', {
    slidesPerView: 1,
    spaceBetween: 50,
    speed: 800,
    grabCursor: true,
  });

  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      swiper.slideTo(index);
    });
  });

  swiper.on('slideChange', () => {
    navItems.forEach(el => el.classList.remove('active'));
    navItems[swiper.activeIndex].classList.add('active');
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-track',
      start: 'top top',
      end: '+=2000', 
      scrub: 2.5, 
    }
  });

  tl.to('.hero-text', { opacity: 0, y: -50, duration: 1 })
    .to('.bg-overlay', { backgroundColor: 'rgba(3, 7, 18, 0.75)', duration: 1.5 }, '<')
    .to('.expandable-rect', {
      width: '95vw',
      height: '75vh',
      bottom: '15%',
      borderRadius: '20px',
      duration: 2,
      ease: 'power2.inOut'
    }, '<')
    .to('.carousel-nav', { opacity: 1, y: 0, duration: 1 }, '-=0.5');

  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 110) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav-overlay');

  menuToggle?.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileNav?.classList.toggle('active');
    
    if (mobileNav?.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  const mobileLinks = document.querySelectorAll('.mobile-nav-overlay a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle?.classList.remove('active');
      mobileNav?.classList.remove('active');
      document.body.style.overflow = ''; 
    });
  });

  const starsContainer = document.getElementById('stars-container');
  const numberOfStars = 80; 

  for (let i = 0; i < numberOfStars; i++) {
    const star = document.createElement('div');
    star.classList.add('star');
    
    const duration = Math.random() * (7 - 4) + 4; 
    const delay = Math.random() * 4; 
    const size = Math.random() * 2 + 1; 

    star.style.left = `${Math.random() * 100}vw`;
    star.style.top = `${Math.random() * 100}vh`;
    
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${delay}s`;

    starsContainer?.appendChild(star);
  }




  const revealText = document.querySelector('.scroll-reveal-text');
  
  if (revealText) {

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
      }
    });
  }



  initWorkSection();

});


/* ============================================================
   SELECTED WORK
   Revelado por máscara + parallax interno + filtrado con Flip.
   ============================================================ */
function initWorkSection(): void {
  const section = document.querySelector<HTMLElement>('.work');
  const grid = section?.querySelector<HTMLElement>('.work__grid');
  if (!section || !grid) return;

  const cards = Array.from(section.querySelectorAll<HTMLElement>('.work-card'));
  if (!cards.length) return;

  const filters = Array.from(section.querySelectorAll<HTMLButtonElement>('.work__filter'));
  const counter = section.querySelector<HTMLElement>('[data-count]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const visibleCards = () => cards.filter(card => !card.classList.contains('is-hidden'));

  /* La columna derecha baja para romper la simetría de la rejilla.
     Se calcula sobre las tarjetas visibles, no sobre el orden del DOM,
     para que el filtro nunca deje huecos. */
  const applyOffsets = () => {
    let column = 0;
    visibleCards().forEach(card => {
      if (card.classList.contains('work-card--wide')) {
        card.classList.remove('is-offset');
        column = 0;
        return;
      }
      card.classList.toggle('is-offset', column === 1);
      column = column === 0 ? 1 : 0;
    });
  };

  const setCount = (value: number, animate = true) => {
    if (!counter) return;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (!animate || reduced) {
      counter.textContent = pad(value);
      return;
    }

    const proxy = { v: parseInt(counter.textContent || '0', 10) };
    gsap.to(proxy, {
      v: value,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => { counter.textContent = pad(Math.round(proxy.v)); },
    });
  };

  applyOffsets();

  if (reduced) {
    setCount(cards.length, false);
  } else {
    // Retícula vertical de fondo
    gsap.to(section.querySelectorAll('.work__rules span'), {
      scaleY: 1,
      duration: 1.6,
      ease: 'power2.inOut',
      stagger: 0.08,
      scrollTrigger: { trigger: section, start: 'top 85%' },
    });

    // Filete bajo la cabecera
    gsap.to(section.querySelector('.work__rule'), {
      scaleX: 1,
      duration: 1.4,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: '.work__head', start: 'top 72%' },
    });

    // Titular: cada línea sube desde su propia máscara
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

    gsap.from(section.querySelectorAll('.work__eyebrow, .work__lede, .work__meta, .work__filter'), {
      y: 24,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: { trigger: '.work__head', start: 'top 78%' },
    });

    // Cada tarjeta se descubre de abajo a arriba mientras la imagen sale del zoom
    cards.forEach(card => {
      gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 82%' } })
        .from(card.querySelector('.work-card__frame'), {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 1.3,
          ease: 'expo.out',
        })
        .from(card.querySelector('.work-card__media'), {
          scale: 1.3,
          duration: 1.6,
          ease: 'expo.out',
        }, 0)
        .from(card.querySelector('.work-card__bar'), {
          scaleX: 0,
          duration: 1,
          ease: 'power3.out',
        }, 0.3)
        .from(card.querySelectorAll('.work-card__row > *'), {
          yPercent: 70,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.08,
        }, 0.35);
    });

    // Parallax dentro del marco (solo escritorio)
    gsap.matchMedia().add('(min-width: 769px)', () => {
      cards.forEach(card => {
        gsap.fromTo(
          card.querySelector('.work-card__media'),
          { yPercent: -4 },
          {
            yPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
      });
    });

    ScrollTrigger.create({
      trigger: '.work__head',
      start: 'top 75%',
      once: true,
      onEnter: () => setCount(visibleCards().length),
    });
  }

  // Filtrado: Flip anima la rejilla entera de un layout al siguiente
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;

      const filter = btn.dataset.filter || 'all';
      filters.forEach(other => other.classList.toggle('is-active', other === btn));

      const state = Flip.getState(cards);

      cards.forEach(card => {
        const cats = (card.dataset.cat || '').split(' ');
        card.classList.toggle('is-hidden', filter !== 'all' && !cats.includes(filter));
      });

      applyOffsets();

      const count = visibleCards().length;
      section.classList.toggle('is-empty', count === 0);
      setCount(count);

      if (reduced || count === 0) {
        ScrollTrigger.refresh();
        return;
      }

      Flip.from(state, {
        duration: 0.8,
        ease: 'power3.inOut',
        absolute: true,
        stagger: 0.03,
        onEnter: els => gsap.fromTo(
          els,
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.55, delay: 0.12, ease: 'power2.out' }
        ),
        onLeave: els => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.35, ease: 'power2.in' }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });
}
