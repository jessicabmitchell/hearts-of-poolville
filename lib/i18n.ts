// Words around the public forms, in English and Spanish. The forms' own questions and text are
// edited on the admin page. Have a native Spanish speaker look over the Spanish.

import type { Lang } from '@/lib/forms/logic';

export type { Lang };

/** Spanish when the page URL has ?lang=es, English otherwise. */
export function toLang(value: unknown): Lang {
  return value === 'es' ? 'es' : 'en';
}

const en = {
  switchTo: 'Español',
  switchLabel: 'Ver en español',
  common: {
    optional: '(optional)',
    sending: 'Sending...',
    backHome: 'Back to home',
    privacy: 'What you send here goes only to Hearts of Poolville.',
    oneWay: 'Give us at least one way to reach you.',
    opensOn: 'This form opens',
    deadline: 'The deadline to apply is',
    other: 'Other',
    otherPlaceholder: 'Please tell us',
    remove: 'Remove',
  },
  errors: {
    saveFailed: 'Something went wrong and your information was not saved. Please try again in a minute.',
    closed: 'This form is not taking responses right now.',
    full: 'This form is full. Thank you for your interest.',
    answer: 'Please answer:',
    contact: 'Please give us a phone number or an email so we can reach you.',
    email: 'that email address does not look right.',
    number: 'please enter a number.',
    other: 'please fill in the "Other" box.',
  },
  request: {
    title: 'Request help',
    lede: 'Choose what your household needs help with. A volunteer will follow up.',
    chooseForm: 'Open now',
    comingUp: 'Opening soon',
    opens: 'opens',
    closed: 'We are not taking requests right now. Please check back soon.',
  },
};

export type Dict = typeof en;

const es: Dict = {
  switchTo: 'English',
  switchLabel: 'View in English',
  common: {
    optional: '(opcional)',
    sending: 'Enviando...',
    backHome: 'Volver al inicio',
    privacy: 'Lo que envíe aquí solo lo recibe Hearts of Poolville.',
    oneWay: 'Denos al menos una forma de comunicarnos con usted.',
    opensOn: 'Este formulario abre el',
    deadline: 'La fecha límite para enviar la solicitud es el',
    other: 'Otro',
    otherPlaceholder: 'Por favor, díganos',
    remove: 'Quitar',
  },
  errors: {
    saveFailed: 'Algo salió mal y su información no se guardó. Por favor, inténtelo de nuevo en un minuto.',
    closed: 'Este formulario no está recibiendo respuestas en este momento.',
    full: 'Este formulario está lleno. Gracias por su interés.',
    answer: 'Por favor, responda:',
    contact: 'Por favor, denos un número de teléfono o un correo electrónico para comunicarnos con usted.',
    email: 'ese correo electrónico no parece correcto.',
    number: 'por favor, escriba un número.',
    other: 'por favor, llene el espacio de "Otro".',
  },
  request: {
    title: 'Pedir ayuda',
    lede: 'Elija con qué necesita ayuda su hogar. Un voluntario se comunicará con usted.',
    chooseForm: 'Abiertos ahora',
    comingUp: 'Próximamente',
    opens: 'abre el',
    closed: 'No estamos recibiendo solicitudes en este momento. Por favor, vuelva a consultar pronto.',
  },
};

export function dict(lang: Lang): Dict {
  return lang === 'es' ? es : en;
}
