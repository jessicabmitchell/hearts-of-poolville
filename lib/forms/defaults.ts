// The forms the site starts with. The first time a form is needed and it is not in the `forms`
// table yet, it is saved there from here. After that, edit forms on the admin page, not here.

import { emptyT } from './logic';
import type { FormConfig, Option, Question, Section, T } from './types';

const t = (en: string, es: string): T => ({ en, es });
const opt = (id: string, en: string, es: string): Option => ({ id, label: t(en, es) });
const q = (id: string, type: Question['type'], label: T, more: Partial<Question> = {}): Question => ({
  id,
  type,
  label,
  help: emptyT(),
  required: false,
  options: [],
  other: false,
  showIf: null,
  inList: false,
  ...more,
});
const section = (id: string, title: T, questions: Question[], more: Partial<Section> = {}): Section => ({
  id,
  title,
  description: emptyT(),
  showIf: null,
  repeat: null,
  questions,
  ...more,
});

const base = (more: Partial<FormConfig> & Pick<FormConfig, 'name' | 'title' | 'sections'>): FormConfig => ({
  eyebrow: emptyT(),
  intro: emptyT(),
  enabled: true,
  opens: null,
  closes: null,
  closedMessage: t(
    'We are not taking applications right now. Please check back soon.',
    'No estamos recibiendo solicitudes en este momento. Por favor, vuelva a consultar pronto.',
  ),
  submitLabel: t('Send application', 'Enviar solicitud'),
  thanksTitle: t('Thank you. We got your application.', 'Gracias. Recibimos su solicitud.'),
  thanksBody: emptyT(),
  contactRule: true,
  onRequestPage: false,
  archived: false,
  statuses: ['New', 'In progress', 'Done'],
  ...more,
});

// Questions several forms share.
const nameQ = () => q('name', 'short', t('Your name', 'Su nombre'), { required: true, inList: true });
const phoneQ = () => q('phone', 'phone', t('Phone', 'Teléfono'));
const emailQ = () => q('email', 'email', t('Email', 'Correo electrónico'));
const pickupQs = (what: T, who: T) => [
  q('pickup', 'choice', what, {
    required: true,
    options: [opt('me', 'Me', 'Yo'), opt('other', 'Someone else', 'Otra persona')],
  }),
  q('pickup_name', 'short', who, { required: true, showIf: { question: 'pickup', equals: 'other' } }),
];

function dinner(more: Pick<FormConfig, 'name' | 'eyebrow' | 'title' | 'intro' | 'opens' | 'closes' | 'thanksBody'>) {
  const forOther = { question: 'for_who', equals: 'other' };
  const forSelf = { question: 'for_who', equals: 'self' };
  const familySize = t('Family size', 'Tamaño de la familia');
  const familySizeHelp = t(
    'How many people will eat this dinner, counting everyone in the home.',
    'Cuántas personas comerán esta cena, contando a todos en el hogar.',
  );
  return base({
    ...more,
    onRequestPage: true,
    sections: [
      section('start', emptyT(), [
        q(
          'for_who',
          'choice',
          t(
            'Are you filling out this form for yourself or for someone else?',
            '¿Está llenando este formulario para usted o para otra persona?',
          ),
          {
            required: true,
            inList: true,
            options: [opt('self', 'My family', 'Mi familia'), opt('other', 'Another family', 'Otra familia')],
          },
        ),
      ]),
      section('contact', t('My contact information', 'Mi información de contacto'), [
        nameQ(),
        phoneQ(),
        emailQ(),
        ...pickupQs(
          t('Will you be picking up the dinner or someone else?', '¿Usted recogerá la cena u otra persona?'),
          t('Who will pick it up?', '¿Quién la recogerá?'),
        ),
      ]),
      section(
        'my_family',
        t('My family', 'Mi familia'),
        [
          q('household', 'number', familySize, { required: true, inList: true, help: familySizeHelp }),
          q('address', 'long', t('Address', 'Dirección')),
        ],
        { showIf: forSelf },
      ),
      section(
        'recipient',
        t("Dinner recipient's information", 'Información de la familia que recibirá la cena'),
        [
          q('recipient_name', 'short', t('Name', 'Nombre'), { required: true, inList: true }),
          q('recipient_household', 'number', familySize, { required: true, inList: true, help: familySizeHelp }),
          q('recipient_address', 'long', t('Address', 'Dirección')),
          q('recipient_phone', 'phone', t('Phone number', 'Número de teléfono')),
          q('recipient_email', 'email', t('Email address', 'Correo electrónico')),
        ],
        {
          showIf: forOther,
          description: t('Fill out as much as you can.', 'Llene todo lo que pueda.'),
        },
      ),
    ],
  });
}

function simpleRequest(name: string, eyebrow: T, title: T, childrenLabel: T): FormConfig {
  return base({
    name,
    eyebrow,
    title,
    enabled: false,
    onRequestPage: true,
    intro: t(
      'Tell us about your household and a volunteer will follow up.',
      'Cuéntenos sobre su hogar y un voluntario se comunicará con usted.',
    ),
    sections: [
      section('contact', emptyT(), [
        nameQ(),
        phoneQ(),
        emailQ(),
        q('address', 'long', t('Address', 'Dirección')),
        q('household', 'number', t('How many people live in your household?', '¿Cuántas personas viven en su hogar?'), {
          required: true,
          inList: true,
        }),
        q('children', 'long', childrenLabel, { inList: true }),
        q('details', 'long', t('Anything else we should know?', '¿Hay algo más que debamos saber?')),
      ]),
    ],
  });
}

export const DEFAULT_FORMS: Record<string, FormConfig> = {
  angel_tree: base({
    name: 'Angel Tree sign-up',
    eyebrow: t('Angel Tree', 'Árbol de Ángeles'),
    title: t('Angel Tree Application', 'Solicitud para el Árbol de Ángeles'),
    intro: t(
      'Present pickup dates are not set yet. We will contact you as soon as we know.\n\n**Please submit one form per family, with all of your children on it.** Thank you.',
      'Las fechas para recoger los regalos aún no están definidas. Nos comunicaremos con usted en cuanto las sepamos.\n\n**Por favor, llene un solo formulario por familia, con todos sus niños.** Gracias.',
    ),
    opens: '2026-10-17',
    closes: '2026-11-21',
    onRequestPage: true,
    thanksBody: t(
      'We will contact you about present pickup as soon as the dates are set.',
      'Nos comunicaremos con usted sobre la recogida de los regalos en cuanto se definan las fechas.',
    ),
    sections: [
      section('start', emptyT(), [
        q(
          'for_who',
          'choice',
          t("Are you filling this out for someone else's child?", '¿Está llenando esto para el hijo de otra persona?'),
          { required: true, options: [opt('other', 'Yes', 'Sí'), opt('self', 'No', 'No')] },
        ),
      ]),
      section('contact', t('My contact information', 'Mi información de contacto'), [
        nameQ(),
        phoneQ(),
        emailQ(),
        ...pickupQs(
          t('Will you be picking up the presents or someone else?', '¿Usted recogerá los regalos u otra persona?'),
          t('Who will pick them up?', '¿Quién los recogerá?'),
        ),
        q('address', 'long', t('Address', 'Dirección'), { showIf: { question: 'for_who', equals: 'self' } }),
      ]),
      section(
        'parent',
        t('Parent / Guardian', 'Padre, madre o tutor'),
        [
          q('parent_name', 'short', t('Name', 'Nombre'), { required: true, inList: true }),
          q('parent_phone', 'phone', t('Phone', 'Teléfono')),
          q('parent_email', 'email', t('Email', 'Correo electrónico')),
          q('parent_address', 'long', t('Address', 'Dirección')),
        ],
        { showIf: { question: 'for_who', equals: 'other' } },
      ),
      section(
        'children',
        t('Angel (child)', 'Ángel (niño)'),
        [
          q('child_name', 'short', t('First name / initials', 'Primer nombre / iniciales'), {
            required: true,
            inList: true,
          }),
          q('age', 'short', t('Age', 'Edad'), { required: true, inList: true }),
          q('gender', 'choice', t('Gender', 'Sexo'), {
            options: [opt('male', 'Male', 'Niño'), opt('female', 'Female', 'Niña')],
          }),
          q('shirt', 'short', t('Shirt / shorts size', 'Talla de camisa / shorts')),
          q('jeans', 'short', t('Jeans size', 'Talla de pantalón de mezclilla')),
          q('shoe', 'short', t('Shoe size', 'Talla de zapato')),
          q('coat', 'short', t('Coat size', 'Talla de abrigo')),
          q('bedding', 'choice', t('Bedding size', 'Tamaño de ropa de cama'), {
            other: true,
            options: [
              opt('twin', 'Twin', 'Individual (twin)'),
              opt('full', 'Full', 'Matrimonial (full)'),
              opt('queen', 'Queen', 'Queen'),
              opt('king', 'King', 'King'),
            ],
          }),
          q('interests', 'long', t('Interests (sports, activities, etc.)', 'Intereses (deportes, actividades, etc.)')),
          q('color', 'short', t('Favorite color', 'Color favorito')),
          q('wishes', 'long', t('A couple of wish items', 'Un par de cosas que desea')),
        ],
        { repeat: { max: 10, itemLabel: t('Child', 'Niño'), addLabel: t('Add another child', 'Agregar otro niño') } },
      ),
    ],
  }),

  thanksgiving: dinner({
    name: 'Thanksgiving dinner',
    eyebrow: t('Thanksgiving', 'Acción de Gracias'),
    title: t('Thanksgiving Dinner Application', 'Solicitud de cena de Acción de Gracias'),
    intro: t(
      'Pickup for Thanksgiving meals will be **November 24**.',
      'Las cenas se recogerán el **24 de noviembre**.',
    ),
    opens: '2026-10-31',
    closes: '2026-11-15',
    thanksBody: t('Pickup is November 24.', 'La cena se recoge el 24 de noviembre.'),
  }),

  christmas: dinner({
    name: 'Christmas dinner',
    eyebrow: t('Christmas', 'Navidad'),
    title: t('Christmas Dinner Application', 'Solicitud de cena de Navidad'),
    intro: t(
      'The pickup date is not set yet. We will contact you as soon as we know. If you have children in the Angel Tree as well, you will pick up their presents on the same day.',
      'La fecha para recoger aún no está definida. Nos comunicaremos con usted en cuanto la sepamos. Si también tiene hijos en el Árbol de Ángeles, recogerá sus regalos el mismo día.',
    ),
    opens: '2026-12-01',
    closes: '2026-12-15',
    thanksBody: t(
      'We will contact you about pickup as soon as the date is set.',
      'Nos comunicaremos con usted sobre la recogida en cuanto se defina la fecha.',
    ),
  }),

  tags: base({
    name: 'Angel Tree tags',
    eyebrow: t('Angel Tree', 'Árbol de Ángeles'),
    title: t('Took a tag?', '¿Tomó una etiqueta?'),
    intro: t(
      'Tell us which tag you took so we know who has it. Thank you for helping a neighbor.',
      'Díganos qué etiqueta tomó para saber quién la tiene. Gracias por ayudar a un vecino.',
    ),
    opens: '2026-11-26',
    closedMessage: t('The Angel Tree tag form is closed right now.', 'El formulario de etiquetas está cerrado en este momento.'),
    submitLabel: t('Save my tag', 'Guardar mi etiqueta'),
    thanksTitle: t('Thank you for taking a tag.', 'Gracias por tomar una etiqueta.'),
    thanksBody: t(
      'We have your name down for it. Neighbors like you make this possible.',
      'Ya tenemos su nombre anotado. Vecinos como usted hacen esto posible.',
    ),
    statuses: ['Tag taken', 'Gift returned'],
    sections: [
      section('main', emptyT(), [
        q('tags', 'short', t('Which tag did you take?', '¿Qué etiqueta tomó?'), {
          required: true,
          inList: true,
          help: t(
            'Enter the number or name written on the tag. If you took more than one, list them all.',
            'Escriba el número o el nombre que aparece en la etiqueta. Si tomó más de una, escríbalas todas.',
          ),
        }),
        nameQ(),
        phoneQ(),
        emailQ(),
        q('notes', 'long', t('Notes', 'Notas')),
      ]),
    ],
  }),

  help: base({
    name: 'Volunteer sign-up',
    eyebrow: t('Get involved', 'Participe'),
    title: t('I want to help', 'Quiero ayudar'),
    intro: t(
      "Tell us how you'd like to help, and a volunteer will reach out.",
      'Díganos cómo le gustaría ayudar y un voluntario se comunicará con usted.',
    ),
    submitLabel: t('Sign up to help', 'Inscribirme para ayudar'),
    thanksTitle: t('Thank you for offering to help!', '¡Gracias por ofrecer su ayuda!'),
    thanksBody: t('A volunteer will reach out soon.', 'Un voluntario se comunicará con usted pronto.'),
    statuses: ['New', 'Contacted'],
    sections: [
      section('main', emptyT(), [
        nameQ(),
        emailQ(),
        phoneQ(),
        q('help_with', 'checkboxes', t('What would you like to help with?', '¿Con qué le gustaría ayudar?'), {
          required: true,
          inList: true,
          other: true,
          options: [
            opt('christmas', 'Christmas dinner donations', 'Donaciones para la cena de Navidad'),
            opt('thanksgiving', 'Thanksgiving dinner donations', 'Donaciones para la cena de Acción de Gracias'),
            opt('angel_tree', 'Angel Tree donations', 'Donaciones para el Árbol de Ángeles'),
            opt('easter', 'Easter basket donations', 'Donaciones para las canastas de Pascua'),
            opt('back_to_school', 'Back-to-school donations', 'Donaciones para útiles escolares'),
          ],
        }),
      ]),
    ],
  }),

  easter: simpleRequest(
    'Easter baskets',
    t('Easter', 'Pascua'),
    t('Easter Basket Request', 'Solicitud de canasta de Pascua'),
    t("Children's first names and ages", 'Primer nombre y edad de los niños'),
  ),

  back_to_school: simpleRequest(
    'Back-to-school supplies',
    t('Back to school', 'Regreso a clases'),
    t('Back-to-School Supplies Request', 'Solicitud de útiles escolares'),
    t("Children's first names and grades", 'Primer nombre y grado de los niños'),
  ),

  // The site's first request form. Kept only so requests sent through it stay visible.
  request: base({
    name: 'Old request form',
    title: t('Request help', 'Pedir ayuda'),
    archived: true,
    enabled: false,
    sections: [
      section('main', emptyT(), [
        q('programs', 'checkboxes', t('What does your household need help with?', '¿Con qué necesita ayuda su hogar?'), {
          inList: true,
          options: [
            opt('easter', 'Easter baskets', 'Canastas de Pascua'),
            opt('back_to_school', 'Back-to-school supplies', 'Útiles escolares'),
            opt('thanksgiving', 'Thanksgiving dinners', 'Cenas de Acción de Gracias'),
            opt('angel_tree', 'Angel Tree', 'Árbol de Ángeles'),
            opt('christmas', 'Christmas dinners', 'Cenas de Navidad'),
          ],
        }),
        nameQ(),
        phoneQ(),
        emailQ(),
        q('address', 'short', t('Address', 'Dirección')),
        q('household', 'number', t('Household size', 'Tamaño del hogar'), { inList: true }),
        q('details', 'long', t('Details', 'Detalles')),
      ]),
    ],
  }),
};

/** Order of forms in menus. Forms added on the admin page come after these. */
export const DEFAULT_ORDER = Object.keys(DEFAULT_FORMS);

/** Public web address of each form. Forms added on the admin page live at /forms/<slug>. */
const PATHS: Record<string, string> = {
  angel_tree: '/angel-tree/apply',
  thanksgiving: '/thanksgiving',
  christmas: '/christmas',
  tags: '/angel-tree',
  help: '/help',
};

export function formPath(slug: string): string {
  return PATHS[slug] ?? `/forms/${slug}`;
}
