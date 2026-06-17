import './style.scss';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Swiper from 'swiper';
import 'swiper/css';

// Registrar plugin de GSAP
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Inicializar el Carrusel (Swiper)
  const swiper = new Swiper('.mySwiper', {
    slidesPerView: 1,
    spaceBetween: 50,
    speed: 800,
    grabCursor: true,
  });

  // 2. Lógica de los títulos interactivos inferiores
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      swiper.slideTo(index); // Mueve el carrusel al slide correspondiente
    });
  });

  // Actualizar la clase "active" cuando el carrusel cambia
  swiper.on('slideChange', () => {
    navItems.forEach(el => el.classList.remove('active'));
    navItems[swiper.activeIndex].classList.add('active');
  });

  // 3. Crear la línea de tiempo de GSAP atada al Scroll
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-track',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1, // Suaviza la animación para que siga el scroll del mouse
    }
  });

  // Secuencia de animaciones al bajar el scroll:
  tl.to('.hero-text', { opacity: 0, y: -50, duration: 1 }) // Desvanece texto inicial
    .to('body', { backgroundColor: '#453a31', duration: 1.5 }, '<') // Cambia el color de fondo general
    .to('.expandable-rect', {
      width: '95vw',        // Se ensancha
      height: '75vh',       // Sube y ocupa la pantalla
      bottom: '15%',        // Deja espacio para la navegación
      borderRadius: '20px', // Reduce el borde
      duration: 2,
      ease: 'power2.inOut'
    }, '<') // El '<' hace que esta animación inicie al mismo tiempo que la anterior
    .to('.swiper', { opacity: 1, duration: 0.5 }, '-=0.5') // Muestra el carrusel
    .to('.carousel-nav', { opacity: 1, y: 0, duration: 1 }, '-=0.5'); // Aparecen los títulos inferiores
});