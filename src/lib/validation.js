import { HttpError } from './errors.js';

export function requiredText(value, field, maximum = 100) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maximum) {
    throw new HttpError(422, 'validation_error', `${field} é obrigatório e deve ter até ${maximum} caracteres`);
  }
  return value.trim();
}

export function requiredUuid(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(422, 'validation_error', `${field} deve ser um UUID válido`);
  }
  return value;
}

export function futureDate(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf()) || date <= new Date()) {
    throw new HttpError(422, 'validation_error', `${field} deve ser uma data futura válida`);
  }
  return date;
}
