import { apiFetch, toQuery } from './client'
import type { CountryOut, SubdivisionOut } from './types'

export function listCountries(locale?: string): Promise<CountryOut[]> {
  return apiFetch(`/geo/countries${toQuery({ locale })}`)
}

export function getCountry(code: string, locale?: string): Promise<CountryOut> {
  return apiFetch(`/geo/countries/${encodeURIComponent(code)}${toQuery({ locale })}`)
}

export function listSubdivisions(code: string, locale?: string): Promise<SubdivisionOut[]> {
  return apiFetch(`/geo/countries/${encodeURIComponent(code)}/subdivisions${toQuery({ locale })}`)
}
