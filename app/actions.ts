'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { HOLIDAYS, PROGRAMS, getProgram, isOpen, type Holiday } from '@/lib/programs';
import { dict, toLang } from '@/lib/i18n';
import { isEmail, text } from '@/lib/validate';
import type { FormState } from '@/lib/types';

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

export async function submitAngelTree(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const err = dict(lang).errors;
  if (!isOpen(getProgram('angel_tree'))) return { status: 'error', message: err.closed };

  const values = {
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
    child_name: text(formData.get('child_name'), 60),
    age: text(formData.get('age'), 30),
    gender: text(formData.get('gender'), 10),
    shirt: text(formData.get('shirt'), 40),
    jeans: text(formData.get('jeans'), 40),
    shoe: text(formData.get('shoe'), 40),
    coat: text(formData.get('coat'), 40),
    bedding: text(formData.get('bedding'), 10),
    bedding_other: text(formData.get('bedding_other'), 60),
    interests: text(formData.get('interests'), 1000),
    color: text(formData.get('color'), 60),
    wishes: text(formData.get('wishes'), 1000),
  };

  const forSelf = values.for_who === 'self';
  const bedding = BEDDING.includes(values.bedding)
    ? values.bedding
    : values.bedding === 'other'
      ? values.bedding_other
      : '';

  let message = '';
  if (values.for_who !== 'self' && values.for_who !== 'other') message = err.forChild;
  else if (!values.name) message = err.name;
  else if (!values.phone && !values.email) message = err.contact;
  else if (values.email && !isEmail(values.email)) message = err.email;
  else if (values.pickup !== 'me' && values.pickup !== 'other') message = err.pickup;
  else if (values.pickup === 'other' && !values.pickup_name) message = err.pickupName;
  else if (!forSelf && !values.parent_name) message = err.parentName;
  else if (!forSelf && values.parent_email && !isEmail(values.parent_email)) message = err.parentEmail;
  else if (!values.child_name) message = err.childName;
  else if (!values.age) message = err.childAge;
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('angel_tree_applications')
      .insert({
        for_self: forSelf,
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        pickup_by: values.pickup === 'other' ? values.pickup_name : null,
        parent_name: forSelf ? null : values.parent_name,
        parent_phone: forSelf ? null : values.parent_phone || null,
        parent_email: forSelf ? null : values.parent_email || null,
        address: values.address || null,
        child_name: values.child_name,
        age: values.age,
        gender: values.gender === 'male' || values.gender === 'female' ? values.gender : null,
        shirt_size: values.shirt || null,
        jeans_size: values.jeans || null,
        shoe_size: values.shoe || null,
        coat_size: values.coat || null,
        bedding_size: bedding || null,
        interests: values.interests || null,
        favorite_color: values.color || null,
        wishes: values.wishes || null,
        language: lang,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitAngelTree failed', e);
    return { status: 'error', message: err.saveFailed, values };
  }

  // Send the grown-up's details back so "Sign up another child" can start with them filled in.
  const { for_who, name, phone, email, pickup, pickup_name, parent_name, parent_phone, parent_email, address } =
    values;
  return {
    status: 'ok',
    values: { for_who, name, phone, email, pickup, pickup_name, parent_name, parent_phone, parent_email, address },
    message: values.child_name,
  };
}

export async function submitTagPickup(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

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
