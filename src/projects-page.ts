import './style.scss';
import './styles/footer.scss';
import { initShared } from './shared';
import { initProjects } from './projects';

document.addEventListener('DOMContentLoaded', () => {
  initShared();
  initProjects();
});
