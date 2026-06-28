import './style.scss';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Swiper from 'swiper';
import 'swiper/css';

gsap.registerPlugin(ScrollTrigger);

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



});
