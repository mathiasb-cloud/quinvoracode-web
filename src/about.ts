import './style.scss';
import './styles/footer.scss';
import './styles/about.scss';
import { initShared } from './shared';
import { initTunnel } from './tunnel';

document.addEventListener('DOMContentLoaded', () => {
  initShared();
  initTunnel();
});
