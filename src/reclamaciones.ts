/* ============================================================
   LIBRO DE RECLAMACIONES
   Valida la hoja, le asigna un numero, muestra la constancia para
   imprimir o guardar en PDF y la envia por correo a soporte con
   copia al consumidor (asi ambos quedan con el registro).
   ============================================================ */
import './style.scss';
import './styles/footer.scss';
import './styles/legal.scss';
import { initShared } from './shared';

const CORREO = 'soporte@quinvoracode.com';

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** LR-AAAA-MMDDHHMMSS: unico por segundo y facil de citar por telefono. */
function numeroReclamo(fecha: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `LR-${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}${d(fecha.getDate())}${d(fecha.getHours())}${d(fecha.getMinutes())}${d(fecha.getSeconds())}`;
}

function iniciarLibro(): void {
  const form = document.querySelector<HTMLFormElement>('#formReclamo');
  const constancia = document.querySelector<HTMLElement>('#reclamoConstancia');
  const error = document.querySelector<HTMLElement>('#reclamoError');
  const menor = document.querySelector<HTMLInputElement>('#reclamoMenor');
  const apoderado = document.querySelector<HTMLElement>('#reclamoApoderado');
  if (!form || !constancia || !error || !menor || !apoderado) return;

  menor.addEventListener('change', () => {
    apoderado.hidden = !menor.checked;
    apoderado.querySelector('input')!.required = menor.checked;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    error.hidden = true;
    if (!form.checkValidity()) {
      const invalido = form.querySelector<HTMLElement>(':invalid');
      error.textContent = 'Completa los campos marcados con * y revisa que el correo sea válido.';
      error.hidden = false;
      invalido?.focus();
      return;
    }

    const datos = new FormData(form);
    const v = (campo: string) => String(datos.get(campo) ?? '').trim();
    const fecha = new Date();
    const numero = numeroReclamo(fecha);
    const cuando = fecha.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
    const monto = v('monto') ? `S/ ${Number(v('monto')).toFixed(2)}` : 'No indicado';

    const filas: [string, string][] = [
      ['Número', numero],
      ['Fecha', cuando],
      ['Nombre', v('nombre')],
      ['Documento', `${v('tipoDocumento')} ${v('documento')}`],
      ['Domicilio', v('domicilio')],
      ['Teléfono', v('telefono')],
      ['Correo', v('correo')],
      ...(menor.checked ? [['Padre, madre o apoderado', v('apoderado')] as [string, string]] : []),
      ['Bien contratado', `${v('tipoBien')}: ${v('descripcionBien')}`],
      ['Monto reclamado', monto],
      ['Tipo', v('tipo')],
      ['Detalle', v('detalle')],
      ['Pedido', v('pedido')],
    ];

    const texto = [
      `LIBRO DE RECLAMACIONES · ${numero}`,
      'Proveedor: BENITES LOPEZ MATHIAS JOAQUIN (Quinvora Code) · RUC 10607991419',
      '',
      ...filas.map(([k, val]) => `${k}: ${val}`),
      '',
      'Respuesta en un plazo máximo de 15 días hábiles.',
    ].join('\n');

    const mailto = `mailto:${CORREO}?cc=${encodeURIComponent(v('correo'))}`
      + `&subject=${encodeURIComponent(`${v('tipo')} ${numero}`)}`
      + `&body=${encodeURIComponent(texto)}`;

    constancia.innerHTML = `
      <div class="reclamo__ok">
        <span class="legal__eyebrow">${escapar(v('tipo'))} registrado</span>
        <h2>${numero}</h2>
        <p>Se abrió tu aplicación de correo con la hoja de reclamación dirigida a ${CORREO}, con copia para ti.
           <strong>Envíala para completar el registro.</strong> Te responderemos en un máximo de 15 días hábiles.</p>
        <div class="reclamo__acciones">
          <a class="btn-glow" href="${mailto}">Enviar por correo</a>
          <button type="button" class="btn-soft" data-imprimir>Imprimir o guardar PDF</button>
        </div>
      </div>
      <dl class="legal__ficha legal__ficha--constancia">
        ${filas.map(([k, val]) => `<div><dt>${escapar(k)}</dt><dd>${escapar(val)}</dd></div>`).join('')}
      </dl>`;

    form.hidden = true;
    constancia.hidden = false;
    constancia.querySelector('[data-imprimir]')?.addEventListener('click', () => window.print());
    constancia.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.location.href = mailto;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initShared();
  iniciarLibro();
});
