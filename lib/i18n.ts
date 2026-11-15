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
  donate: {
    eyebrow: 'Donate food',
    title: 'Donate food for {event} meals',
    lede: 'Choose what you can bring and a time to drop it off. The numbers show what families still need.',
    noSlots: 'Drop-off times will be posted soon. Please check back.',
    allCovered: 'Every item is covered right now. Thank you, neighbors!',
    itemsLegend: 'What will you bring?',
    stillNeeded: 'still needed',
    covered: 'Covered, thank you!',
    howMany: 'How many',
    otherLabel: 'Anything else you would like to bring?',
    slotLegend: 'When will you drop it off?',
    spotsLeft: 'spots left',
    contactHeading: 'Your contact information',
    name: 'Your name',
    phone: 'Phone',
    email: 'Email',
    submit: 'Sign up to donate',
    thanksTitle: 'Thank you! You are signed up.',
    yourCode: 'Your donation code',
    bring: 'Please bring',
    dropOff: 'Drop-off',
    showCode: 'Give this code when you drop off your donation. You may want to take a picture of this screen.',
    errors: {
      nothing: 'Please choose at least one item, or tell us what else you will bring.',
      slot: 'Please choose a drop-off time.',
      slotGone: 'That drop-off time is no longer available. Please choose another.',
      slotFull: 'That drop-off time just filled up. Please choose another.',
      tooMany: '{item}: only {left} still needed. Please lower the amount.',
      name: 'Please enter your name.',
    },
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
  donate: {
    eyebrow: 'Done alimentos',
    title: 'Done alimentos para las cenas de {event}',
    lede: 'Elija lo que puede traer y una hora para entregarlo. Los números muestran lo que las familias todavía necesitan.',
    noSlots: 'Pronto publicaremos los horarios de entrega. Por favor, vuelva a consultar.',
    allCovered: 'Ya tenemos todo lo necesario por ahora. ¡Gracias, vecinos!',
    itemsLegend: '¿Qué va a traer?',
    stillNeeded: 'todavía se necesitan',
    covered: '¡Ya está cubierto, gracias!',
    howMany: 'Cuántos',
    otherLabel: '¿Algo más que le gustaría traer?',
    slotLegend: '¿Cuándo lo va a entregar?',
    spotsLeft: 'lugares disponibles',
    contactHeading: 'Su información de contacto',
    name: 'Su nombre',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    submit: 'Inscribirme para donar',
    thanksTitle: '¡Gracias! Ya está inscrito.',
    yourCode: 'Su código de donación',
    bring: 'Por favor, traiga',
    dropOff: 'Entrega',
    showCode: 'Dé este código cuando entregue su donación. Puede tomarle una foto a esta pantalla.',
    errors: {
      nothing: 'Por favor, elija al menos un artículo o díganos qué más va a traer.',
      slot: 'Por favor, elija una hora de entrega.',
      slotGone: 'Ese horario de entrega ya no está disponible. Por favor, elija otro.',
      slotFull: 'Ese horario de entrega se acaba de llenar. Por favor, elija otro.',
      tooMany: '{item}: solo se necesitan {left}. Por favor, baje la cantidad.',
      name: 'Por favor, escriba su nombre.',
    },
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
