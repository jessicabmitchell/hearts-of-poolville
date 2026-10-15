'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { HOLIDAYS, PROGRAMS, TAG_FORM, getProgram, isOpen, type Holiday } from '@/lib/programs';
import { dict, toLang } from '@/lib/i18n';
import { isEmail, text } from '@/lib/validate';
import { HELP_OPTIONS, type FormState } from '@/lib/types';

export async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  // Hidden "website" field: real people leave it empty, form-filling bots do not.
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const err = dict(toLang(formData.get('lang'))).errors;
  const picked = formData.getAll('programs').map(String);
  const values = {
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    address: text(formData.get('address'), 200),
    household: text(formData.get('household'), 3),
    details: text(formData.get('details'), 1500),
    programs: picked,
  };

  const openIds = PROGRAMS.filter((p) => isOpen(p) && !p.formHref).map((p) => p.id);
  const programs = Array.from(new Set(picked.filter((id) => openIds.includes(id))));
  const household = Number.parseInt(values.household, 10);

  let message = '';
  if (!values.name) message = err.name;
  else if (programs.length === 0) message = err.programs;
  else if (!values.phone && !values.email) message = err.contact;
  else if (values.email && !isEmail(values.email)) message = err.email;
  else if (!Number.isInteger(household) || household < 1 || household > 30) message = err.household;
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('help_requests')
      .insert({
        programs,
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        household_size: household,
        details: values.details || null,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitRequest failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok' };
}

export async function submitDinner(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const err = dict(lang).errors;
  const holiday = text(formData.get('holiday'), 20) as Holiday;
  if (!HOLIDAYS.includes(holiday) || !isOpen(getProgram(holiday))) {
    return { status: 'error', message: err.closed };
  }
  const values = {
    for_who: text(formData.get('for_who'), 10),
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    pickup: text(formData.get('pickup'), 10),
    pickup_name: text(formData.get('pickup_name'), 100),
    recipient_name: text(formData.get('recipient_name'), 100),
    household: text(formData.get('household'), 3),
    address: text(formData.get('address'), 300),
    recipient_phone: text(formData.get('recipient_phone'), 40),
    recipient_email: text(formData.get('recipient_email'), 120),
  };

  const forSelf = values.for_who === 'self';
  const household = Number.parseInt(values.household, 10);

  let message = '';
  if (values.for_who !== 'self' && values.for_who !== 'other') message = err.forWho;
  else if (!values.name) message = err.name;
  else if (!values.phone && !values.email) message = err.contact;
  else if (values.email && !isEmail(values.email)) message = err.email;
  else if (values.pickup !== 'me' && values.pickup !== 'other') message = err.pickup;
  else if (values.pickup === 'other' && !values.pickup_name) message = err.pickupName;
  else if (!forSelf && !values.recipient_name) message = err.recipientName;
  else if (!Number.isInteger(household) || household < 1 || household > 30) message = err.familySize;
  else if (!forSelf && values.recipient_email && !isEmail(values.recipient_email)) message = err.recipientEmail;
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('dinner_applications')
      .insert({
        holiday,
        for_self: forSelf,
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        pickup_by: values.pickup === 'other' ? values.pickup_name : null,
        recipient_name: forSelf ? null : values.recipient_name,
        recipient_phone: forSelf ? null : values.recipient_phone || null,
        recipient_email: forSelf ? null : values.recipient_email || null,
        household_size: household,
        address: values.address || null,
        language: lang,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitDinner failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok' };
}

const BEDDING = ['twin', 'full', 'queen', 'king'];
const CHILD_FIELDS = ['name', 'age', 'gender', 'shirt', 'jeans', 'shoe', 'coat', 'bedding', 'bedding_other', 'interests', 'color', 'wishes'];
const CHILD_LIMITS: Record<string, number> = { name: 60, age: 30, gender: 10, bedding: 10, interests: 1000, wishes: 1000 };
/** Most children one form can hold. Keep in step with MAX_CHILDREN in components/AngelTreeForm.tsx. */
const MAX_CHILDREN = 10;

export async function submitAngelTree(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const err = dict(lang).errors;
  const childLabel = dict(lang).angelApp.childHeading;
  if (!isOpen(getProgram('angel_tree'))) return { status: 'error', message: err.closed };

  const values: Record<string, string | string[]> = {
    for_who: text(formData.get('for_who'), 10),
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    pickup: text(formData.get('pickup'), 10),
    pickup_name: text(formData.get('pickup_name'), 100),
    parent_name: text(formData.get('parent_name'), 100),
    parent_phone: text(formData.get('parent_phone'), 40),
    parent_email: text(formData.get('parent_email'), 120),
    address: text(formData.get('address'), 300),
  };
  const get = (key: string) => values[key] as string;

  // Each child's fields are named c<key>_<field>; child_keys lists the keys in order.
  const keys = Array.from(new Set(formData.getAll('child_keys').map(String)))
    .filter((k) => /^\d{1,3}$/.test(k))
    .slice(0, MAX_CHILDREN);
  const children = keys.map((k) => {
    const child: Record<string, string> = {};
    for (const field of CHILD_FIELDS) {
      child[field] = text(formData.get(`c${k}_${field}`), CHILD_LIMITS[field] ?? 60);
      values[`c${k}_${field}`] = child[field];
    }
    return child;
  });

  const forSelf = get('for_who') === 'self';

  let message = '';
  if (get('for_who') !== 'self' && get('for_who') !== 'other') message = err.forChild;
  else if (!get('name')) message = err.name;
  else if (!get('phone') && !get('email')) message = err.contact;
  else if (get('email') && !isEmail(get('email'))) message = err.email;
  else if (get('pickup') !== 'me' && get('pickup') !== 'other') message = err.pickup;
  else if (get('pickup') === 'other' && !get('pickup_name')) message = err.pickupName;
  else if (!forSelf && !get('parent_name')) message = err.parentName;
  else if (!forSelf && get('parent_email') && !isEmail(get('parent_email'))) message = err.parentEmail;
  else if (children.length === 0) message = err.childName;
  else {
    const i = children.findIndex((ch) => !ch.name || !ch.age);
    if (i >= 0) message = `${childLabel} ${i + 1}: ${children[i].name ? err.childAge : err.childName}`;
  }
  if (message) return { status: 'error', message, values };

  const familyId = crypto.randomUUID();
  const rows = children.map((ch) => {
    const bedding = BEDDING.includes(ch.bedding) ? ch.bedding : ch.bedding === 'other' ? ch.bedding_other : '';
    return {
      family_id: familyId,
      for_self: forSelf,
      name: get('name'),
      phone: get('phone') || null,
      email: get('email') || null,
      pickup_by: get('pickup') === 'other' ? get('pickup_name') : null,
      parent_name: forSelf ? null : get('parent_name'),
      parent_phone: forSelf ? null : get('parent_phone') || null,
      parent_email: forSelf ? null : get('parent_email') || null,
      address: get('address') || null,
      child_name: ch.name,
      age: ch.age,
      gender: ch.gender === 'male' || ch.gender === 'female' ? ch.gender : null,
      shirt_size: ch.shirt || null,
      jeans_size: ch.jeans || null,
      shoe_size: ch.shoe || null,
      coat_size: ch.coat || null,
      bedding_size: bedding || null,
      interests: ch.interests || null,
      favorite_color: ch.color || null,
      wishes: ch.wishes || null,
      language: lang,
    };
  });

  try {
    // One insert, so either every child in the family is saved or none are.
    const { error } = await createAdminClient().from('angel_tree_applications').insert(rows);
    if (error) throw error;
  } catch (e) {
    console.error('submitAngelTree failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok', values: { child_names: children.map((ch) => ch.name) } };
}

export async function submitHelpOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const err = dict(lang).errors;
  const picked = formData.getAll('help').map(String);
  const values = {
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    other: text(formData.get('other'), 500),
    help: picked,
  };
  const helpWith = HELP_OPTIONS.filter((o) => picked.includes(o));

  let message = '';
  if (!values.name) message = err.name;
  else if (!values.phone && !values.email) message = err.contact;
  else if (values.email && !isEmail(values.email)) message = err.email;
  else if (helpWith.length === 0) message = err.helpPick;
  else if (helpWith.includes('other') && !values.other) message = err.helpOther;
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('help_offers')
      .insert({
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        help_with: helpWith,
        other: helpWith.includes('other') ? values.other : null,
        language: lang,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitHelpOffer failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok' };
}

export async function submitTagPickup(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  if (!isOpen(TAG_FORM)) return { status: 'error', message: dict(toLang(formData.get('lang'))).errors.closed };

  const err = dict(toLang(formData.get('lang'))).errors;
  const values = {
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    tags: text(formData.get('tags'), 200),
    notes: text(formData.get('notes'), 500),
  };

  let message = '';
  if (!values.name) message = err.name;
  else if (!values.tags) message = err.tags;
  else if (!values.phone && !values.email) message = err.contact;
  else if (values.email && !isEmail(values.email)) message = err.email;
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('tag_pickups')
      .insert({
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        tag_numbers: values.tags,
        notes: values.notes || null,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitTagPickup failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok' };
}
